import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { transfers_status } from '@prisma/client';

export const getTransfers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const transfers = await prisma.transfer.findMany({
      include: {
        warehouses_transfers_from_warehouseTowarehouses: true,
        warehouses_transfers_to_warehouseTowarehouses: true,
        transfer_items: { include: { products: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── helpers ──────────────────────────────────────────────────────────────────

async function applyTransferStock(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  transferId: number,
  items: Array<{ productId: number; fromLocationId: number; toLocationId: number; quantity: number }>,
) {
  for (const item of items) {
    const balance = await tx.stockBalance.findUnique({
      where: { product_id_location_id: { product_id: item.productId, location_id: item.fromLocationId } },
    });
    if (!balance || Number(balance.quantity) < item.quantity) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      throw new Error(`INSUFFICIENT_STOCK:${product?.name || item.productId}`);
    }

    await tx.stockBalance.update({
      where: { product_id_location_id: { product_id: item.productId, location_id: item.fromLocationId } },
      data: { quantity: { decrement: item.quantity } },
    });
    await tx.stockBalance.upsert({
      where: { product_id_location_id: { product_id: item.productId, location_id: item.toLocationId } },
      update: { quantity: { increment: item.quantity } },
      create: { product_id: item.productId, location_id: item.toLocationId, quantity: item.quantity },
    });
    await tx.stockMove.create({
      data: {
        product_id: item.productId,
        from_location: item.fromLocationId,
        to_location: item.toLocationId,
        quantity: item.quantity,
        move_type: 'transfer',
        reference_table: 'transfers',
        reference_id: transferId,
      },
    });
  }
}

async function reverseTransferStock(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  transferId: number,
  items: Array<{ product_id: number | null; from_location: number | null; to_location: number | null; quantity: any }>,
) {
  for (const item of items) {
    if (item.product_id && item.from_location && item.quantity) {
      // Restore source
      await tx.stockBalance.updateMany({
        where: { product_id: item.product_id, location_id: item.from_location },
        data: { quantity: { increment: item.quantity } },
      });
    }
    if (item.product_id && item.to_location && item.quantity) {
      // Remove from destination
      await tx.stockBalance.updateMany({
        where: { product_id: item.product_id, location_id: item.to_location },
        data: { quantity: { decrement: item.quantity } },
      });
    }
  }
  await tx.stockMove.deleteMany({
    where: { reference_table: 'transfers', reference_id: transferId },
  });
}

// ── controllers ──────────────────────────────────────────────────────────────

export const createTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromWarehouseId, toWarehouseId, date, notes, items, status: requestedStatus } = req.body;

    if (!fromWarehouseId || !toWarehouseId || !date || !items?.length) {
      res.status(400).json({ error: 'fromWarehouseId, toWarehouseId, date, and items are required' });
      return;
    }

    // Per-item same-location guard (Bug #2)
    for (const item of items) {
      if (item.fromLocationId === item.toLocationId) {
        res.status(400).json({ error: 'Source and destination location must be different for each item.' });
        return;
      }
    }

    const validStatuses = ['draft', 'waiting', 'ready', 'done'];
    const initialStatus: string = validStatuses.includes(requestedStatus) ? requestedStatus : 'draft';

    const reference = `TRF-${Date.now()}`;

    const transfer = await prisma.$transaction(async (tx) => {
      const newTransfer = await tx.transfer.create({
        data: {
          reference_no: reference,
          from_warehouse: fromWarehouseId,
          to_warehouse: toWarehouseId,
          created_at: new Date(date),
          status: initialStatus as transfers_status,
          transfer_items: {
            create: items.map((item: any) => ({
              product_id: item.productId,
              from_location: item.fromLocationId,
              to_location: item.toLocationId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          warehouses_transfers_from_warehouseTowarehouses: true,
          warehouses_transfers_to_warehouseTowarehouses: true,
          transfer_items: { include: { products: true } },
        },
      });

      if (initialStatus === 'done') {
        await applyTransferStock(tx, newTransfer.id, items);
      }

      return newTransfer;
    });

    res.status(201).json(transfer);
  } catch (error: any) {
    if (error.message?.startsWith('INSUFFICIENT_STOCK:')) {
      res.status(400).json({ error: `Insufficient stock for transfer: ${error.message.split(':')[1]}` });
      return;
    }
    console.error('Create transfer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** Issue A fix: new updateTransferStatus endpoint — mirrors receipt/delivery pattern */
export const updateTransferStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const transferId = parseInt(id);

    const allStatuses = ['draft', 'waiting', 'ready', 'done', 'cancelled'];
    if (!status || !allStatuses.includes(status)) {
      res.status(400).json({ error: `Status must be one of: ${allStatuses.join(', ')}` });
      return;
    }

    const existing = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: { transfer_items: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Transfer not found' });
      return;
    }

    if (existing.status === 'cancelled') {
      res.status(409).json({ error: 'A cancelled transfer cannot be reopened.' });
      return;
    }
    if (existing.status === 'done' && status !== 'cancelled') {
      res.status(409).json({
        error: 'A done transfer can only be cancelled. Create a stock adjustment to correct quantities.',
      });
      return;
    }

    const transfer = await prisma.$transaction(async (tx) => {
      const wasNotDone = existing.status !== 'done';
      const becomingDone = status === 'done';
      const wasDone = existing.status === 'done';
      const becomingCancelled = status === 'cancelled';

      if (wasNotDone && becomingDone) {
        const items = existing.transfer_items.map((i) => ({
          productId: i.product_id!,
          fromLocationId: i.from_location!,
          toLocationId: i.to_location!,
          quantity: Number(i.quantity),
        }));
        await applyTransferStock(tx, transferId, items);
      }

      if (wasDone && becomingCancelled) {
        await reverseTransferStock(tx, transferId, existing.transfer_items);
      }

      return tx.transfer.update({
        where: { id: transferId },
        data: { status },
        include: {
          warehouses_transfers_from_warehouseTowarehouses: true,
          warehouses_transfers_to_warehouseTowarehouses: true,
          transfer_items: { include: { products: true } },
        },
      });
    });

    res.json(transfer);
  } catch (error: any) {
    if (error.message?.startsWith('INSUFFICIENT_STOCK:')) {
      res.status(400).json({ error: `Insufficient stock for transfer: ${error.message.split(':')[1]}` });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Transfer not found' });
      return;
    }
    console.error('Update transfer status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
