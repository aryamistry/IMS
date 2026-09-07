import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { receipts_status } from '@prisma/client';

export const getReceipts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const receipts = await prisma.receipt.findMany({
      include: {
        warehouses: true,
        suppliers: true,
        users: { select: { id: true, name: true, email: true } },
        receipt_items: { include: { products: true, locations: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReceiptById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const receipt = await prisma.receipt.findUnique({
      where: { id: parseInt(id) },
      include: {
        warehouses: true,
        suppliers: true,
        users: { select: { id: true, name: true } },
        receipt_items: { include: { products: true, locations: true } },
      },
    });

    if (!receipt) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── helpers ──────────────────────────────────────────────────────────────────

/** Commit stock into the warehouse for a set of receipt items. */
async function applyReceiptStock(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  receiptId: number,
  items: Array<{ productId: number; locationId: number; quantity: number }>,
) {
  for (const item of items) {
    await tx.stockBalance.upsert({
      where: { product_id_location_id: { product_id: item.productId, location_id: item.locationId } },
      update: { quantity: { increment: item.quantity } },
      create: { product_id: item.productId, location_id: item.locationId, quantity: item.quantity },
    });
    await tx.stockMove.create({
      data: {
        product_id: item.productId,
        to_location: item.locationId,
        quantity: item.quantity,
        move_type: 'receipt',
        reference_table: 'receipts',
        reference_id: receiptId,
      },
    });
  }
}

/** Reverse (undo) previously committed stock for a receipt. */
async function reverseReceiptStock(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  receiptId: number,
  items: Array<{ product_id: number | null; location_id: number | null; quantity: any }>,
) {
  for (const item of items) {
    if (item.product_id && item.location_id && item.quantity) {
      await tx.stockBalance.updateMany({
        where: { product_id: item.product_id, location_id: item.location_id },
        data: { quantity: { decrement: item.quantity } },
      });
    }
  }
  await tx.stockMove.deleteMany({
    where: { reference_table: 'receipts', reference_id: receiptId },
  });
}

// ── controllers ──────────────────────────────────────────────────────────────

export const createReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { warehouseId, supplierId, date, notes, items, status: requestedStatus } = req.body;
    const userId = req.user!.id;

    if (!warehouseId || !supplierId || !date || !items?.length) {
      res.status(400).json({ error: 'warehouseId, supplierId, date, and items are required' });
      return;
    }

    // Default to 'draft'; caller may explicitly pass 'done' to commit stock immediately.
    const validStatuses = ['draft', 'waiting', 'ready', 'done'];
    const initialStatus: string = validStatuses.includes(requestedStatus) ? requestedStatus : 'draft';

    const reference = `REC-${Date.now()}`;

    const receipt = await prisma.$transaction(async (tx) => {
      const newReceipt = await tx.receipt.create({
        data: {
          reference_no: reference,
          warehouse_id: warehouseId,
          supplier_id: supplierId,
          created_by: userId,
          created_at: new Date(date),
          status: initialStatus as receipts_status,
          receipt_items: {
            create: items.map((item: any) => ({
              product_id: item.productId,
              location_id: item.locationId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          receipt_items: { include: { products: true, locations: true } },
          warehouses: true,
          suppliers: true,
        },
      });

      // Only commit stock when status starts as 'done'
      if (initialStatus === 'done') {
        await applyReceiptStock(tx, newReceipt.id, items);
      }

      return newReceipt;
    });

    res.status(201).json(receipt);
  } catch (error) {
    console.error('Create receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReceiptStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const receiptId = parseInt(id);

    const allStatuses = ['draft', 'waiting', 'ready', 'done', 'cancelled'];
    if (!status || !allStatuses.includes(status)) {
      res.status(400).json({ error: `Status must be one of: ${allStatuses.join(', ')}` });
      return;
    }

    const existing = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { receipt_items: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }

    // Cannot transition OUT of cancelled
    if (existing.status === 'cancelled') {
      res.status(409).json({ error: 'A cancelled receipt cannot be reopened.' });
      return;
    }

    // Cannot make any change once done EXCEPT cancelling
    if (existing.status === 'done' && status !== 'cancelled') {
      res.status(409).json({
        error: 'A done receipt can only be cancelled. Create a stock adjustment to correct quantities.',
      });
      return;
    }

    const receipt = await prisma.$transaction(async (tx) => {
      const wasNotDone = existing.status !== 'done';
      const becomingDone = status === 'done';
      const becomingCancelled = status === 'cancelled';
      const wasDone = existing.status === 'done';

      // Transitioning INTO done → commit stock
      if (wasNotDone && becomingDone) {
        const items = existing.receipt_items.map((i) => ({
          productId: i.product_id!,
          locationId: i.location_id!,
          quantity: Number(i.quantity),
        }));
        await applyReceiptStock(tx, receiptId, items);
      }

      // Transitioning INTO cancelled FROM done → reverse stock
      if (wasDone && becomingCancelled) {
        await reverseReceiptStock(tx, receiptId, existing.receipt_items);
      }

      return tx.receipt.update({
        where: { id: receiptId },
        data: { status },
        include: {
          warehouses: true,
          suppliers: true,
          users: { select: { id: true, name: true } },
          receipt_items: { include: { products: true, locations: true } },
        },
      });
    });

    res.json(receipt);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }
    console.error('Update receipt status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { warehouseId, supplierId, date, notes, items } = req.body;

    if (!warehouseId || !supplierId || !date || !items?.length) {
      res.status(400).json({ error: 'warehouseId, supplierId, date, and items are required' });
      return;
    }

    const receiptId = parseInt(id);

    const receiptCheck = await prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receiptCheck) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }
    // Block edits on finalised receipts
    if (receiptCheck.status === 'done' || receiptCheck.status === 'cancelled') {
      res.status(409).json({
        error: `Cannot edit a ${receiptCheck.status} receipt. Create a stock adjustment to correct stock levels.`,
      });
      return;
    }

    // Only draft/waiting/ready can be edited — no stock moves exist yet, so just swap the items
    const updatedReceipt = await prisma.$transaction(async (tx) => {
      await tx.receiptItem.deleteMany({ where: { receipt_id: receiptId } });

      return tx.receipt.update({
        where: { id: receiptId },
        data: {
          warehouse_id: parseInt(warehouseId),
          supplier_id: parseInt(supplierId),
          created_at: new Date(date),
          receipt_items: {
            create: items.map((item: any) => ({
              product_id: parseInt(item.productId),
              location_id: parseInt(item.locationId),
              quantity: parseFloat(item.quantity),
            })),
          },
        },
        include: {
          receipt_items: { include: { products: true, locations: true } },
          warehouses: true,
          suppliers: true,
        },
      });
    });

    res.json(updatedReceipt);
  } catch (error: any) {
    console.error('Update receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
