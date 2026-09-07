import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

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

export const createReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { warehouseId, supplierId, date, notes, items } = req.body;
    const userId = req.user!.id;

    if (!warehouseId || !supplierId || !date || !items?.length) {
      res.status(400).json({ error: 'warehouseId, supplierId, date, and items are required' });
      return;
    }

    const reference = `REC-${Date.now()}`;

    const receipt = await prisma.$transaction(async (tx) => {
      // Create receipt
      const newReceipt = await tx.receipt.create({
        data: {
          reference_no: reference,
          warehouse_id: warehouseId,
          supplier_id: supplierId,
          created_by: userId,
          created_at: new Date(date),
          status: 'done',
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

      // Update stock balances and record stock moves
      for (const item of items) {
        await tx.stockBalance.upsert({
          where: {
            product_id_location_id: {
              product_id: item.productId,
              location_id: item.locationId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            product_id: item.productId,
            location_id: item.locationId,
            quantity: item.quantity,
          },
        });

        await tx.stockMove.create({
          data: {
            product_id: item.productId,
            to_location: item.locationId,
            quantity: item.quantity,
            move_type: 'receipt',
            reference_table: 'receipts',
            reference_id: newReceipt.id,
          },
        });
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

    const validStatuses = ['draft', 'waiting', 'ready', 'done', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const receipt = await prisma.receipt.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        warehouses: true,
        suppliers: true,
        users: { select: { id: true, name: true } },
        receipt_items: { include: { products: true, locations: true } },
      },
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

    const updatedReceipt = await prisma.$transaction(async (tx) => {
      // 1. Get old items
      const oldReceipt = await tx.receipt.findUnique({
        where: { id: receiptId },
        include: { receipt_items: true }
      });

      if (!oldReceipt) throw new Error('NOT_FOUND');

      // 2. Reverse old stock changes
      for (const oldItem of oldReceipt.receipt_items) {
        if (oldItem.product_id && oldItem.location_id && oldItem.quantity) {
          await tx.stockBalance.updateMany({
            where: { product_id: oldItem.product_id, location_id: oldItem.location_id },
            data: { quantity: { decrement: oldItem.quantity } }
          });
        }
      }
      
      // Delete old stock moves tied to this receipt
      await tx.stockMove.deleteMany({
        where: { reference_table: 'receipts', reference_id: receiptId }
      });

      // Delete old items
      await tx.receiptItem.deleteMany({
        where: { receipt_id: receiptId }
      });

      // 3. Update receipt header and add new items
      const newReceipt = await tx.receipt.update({
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
            }))
          }
        },
        include: {
          receipt_items: { include: { products: true, locations: true } },
          warehouses: true,
          suppliers: true,
        }
      });

      // 4. Apply new stock changes
      for (const item of items) {
        const itemQuantity = parseFloat(item.quantity);
        const stockBalance = await tx.stockBalance.findFirst({
          where: { product_id: parseInt(item.productId), location_id: parseInt(item.locationId) }
        });
        
        if (stockBalance) {
          await tx.stockBalance.update({
            where: { id: stockBalance.id },
            data: { quantity: { increment: itemQuantity } }
          });
        } else {
          await tx.stockBalance.create({
            data: { product_id: parseInt(item.productId), location_id: parseInt(item.locationId), quantity: itemQuantity }
          });
        }

        await tx.stockMove.create({
          data: {
            product_id: parseInt(item.productId),
            to_location: parseInt(item.locationId),
            quantity: itemQuantity,
            move_type: 'receipt',
            reference_table: 'receipts',
            reference_id: receiptId
          }
        });
      }

      return newReceipt;
    });

    res.json(updatedReceipt);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }
    console.error('Update receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
