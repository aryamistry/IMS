import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { delivery_orders_status } from '@prisma/client';

export const getDeliveries = async (_req: Request, res: Response): Promise<void> => {
  try {
    const deliveries = await prisma.deliveryOrder.findMany({
      include: {
        warehouses: true,
        users: { select: { id: true, name: true } },
        delivery_items: { include: { products: true, locations: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── helpers ──────────────────────────────────────────────────────────────────

/** Deduct stock and log moves for a delivery becoming done. */
async function applyDeliveryStock(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  deliveryId: number,
  items: Array<{ productId: number; locationId: number; quantity: number }>,
) {
  for (const item of items) {
    // Validate stock first
    const balance = await tx.stockBalance.findUnique({
      where: { product_id_location_id: { product_id: item.productId, location_id: item.locationId } },
    });
    if (!balance || Number(balance.quantity) < item.quantity) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      throw new Error(`INSUFFICIENT_STOCK:${product?.name || item.productId}`);
    }
    await tx.stockBalance.update({
      where: { product_id_location_id: { product_id: item.productId, location_id: item.locationId } },
      data: { quantity: { decrement: item.quantity } },
    });
    await tx.stockMove.create({
      data: {
        product_id: item.productId,
        from_location: item.locationId,
        quantity: item.quantity,
        move_type: 'delivery',
        reference_table: 'delivery_orders',
        reference_id: deliveryId,
      },
    });
  }
}

/** Restore stock and wipe moves for a delivery being cancelled from done. */
async function reverseDeliveryStock(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  deliveryId: number,
  items: Array<{ product_id: number | null; location_id: number | null; quantity: any }>,
) {
  for (const item of items) {
    if (item.product_id && item.location_id && item.quantity) {
      await tx.stockBalance.updateMany({
        where: { product_id: item.product_id, location_id: item.location_id },
        data: { quantity: { increment: item.quantity } },
      });
    }
  }
  await tx.stockMove.deleteMany({
    where: { reference_table: 'delivery_orders', reference_id: deliveryId },
  });
}

// ── controllers ──────────────────────────────────────────────────────────────

export const createDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { warehouseId, date, notes, items, customerName, status: requestedStatus } = req.body;
    const userId = req.user!.id;

    if (!warehouseId || !date || !items?.length) {
      res.status(400).json({ error: 'warehouseId, date, and items are required' });
      return;
    }

    const validStatuses = ['draft', 'waiting', 'ready', 'done'];
    const initialStatus: string = validStatuses.includes(requestedStatus) ? requestedStatus : 'draft';

    const reference = `DEL-${Date.now()}`;

    const delivery = await prisma.$transaction(async (tx) => {
      // If creating directly as done, validate stock upfront
      if (initialStatus === 'done') {
        for (const item of items) {
          const balance = await tx.stockBalance.findUnique({
            where: { product_id_location_id: { product_id: item.productId, location_id: item.locationId } },
          });
          if (!balance || Number(balance.quantity) < item.quantity) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            throw new Error(`INSUFFICIENT_STOCK:${product?.name || item.productId}`);
          }
        }
      }

      const newDelivery = await tx.deliveryOrder.create({
        data: {
          reference_no: reference,
          warehouse_id: warehouseId,
          customer_name: customerName || null,
          created_by: userId,
          created_at: new Date(date),
          status: initialStatus as delivery_orders_status,
          delivery_items: {
            create: items.map((item: any) => ({
              product_id: item.productId,
              location_id: item.locationId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          delivery_items: { include: { products: true, locations: true } },
          warehouses: true,
        },
      });

      if (initialStatus === 'done') {
        await applyDeliveryStock(tx, newDelivery.id, items);
      }

      return newDelivery;
    });

    res.status(201).json(delivery);
  } catch (error: any) {
    if (error.message?.startsWith('INSUFFICIENT_STOCK:')) {
      res.status(400).json({ error: `Insufficient stock for product: ${error.message.split(':')[1]}` });
      return;
    }
    console.error('Create delivery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDeliveryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const deliveryId = parseInt(id);

    const allStatuses = ['draft', 'waiting', 'ready', 'done', 'cancelled'];
    if (!status || !allStatuses.includes(status)) {
      res.status(400).json({ error: `Status must be one of: ${allStatuses.join(', ')}` });
      return;
    }

    const existing = await prisma.deliveryOrder.findUnique({
      where: { id: deliveryId },
      include: { delivery_items: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Delivery not found' });
      return;
    }

    if (existing.status === 'cancelled') {
      res.status(409).json({ error: 'A cancelled delivery cannot be reopened.' });
      return;
    }
    if (existing.status === 'done' && status !== 'cancelled') {
      res.status(409).json({
        error: 'A done delivery can only be cancelled. Create a stock adjustment to correct quantities.',
      });
      return;
    }

    const delivery = await prisma.$transaction(async (tx) => {
      const wasNotDone = existing.status !== 'done';
      const becomingDone = status === 'done';
      const wasDone = existing.status === 'done';
      const becomingCancelled = status === 'cancelled';

      if (wasNotDone && becomingDone) {
        const items = existing.delivery_items.map((i) => ({
          productId: i.product_id!,
          locationId: i.location_id!,
          quantity: Number(i.quantity),
        }));
        await applyDeliveryStock(tx, deliveryId, items);
      }

      if (wasDone && becomingCancelled) {
        await reverseDeliveryStock(tx, deliveryId, existing.delivery_items);
      }

      return tx.deliveryOrder.update({
        where: { id: deliveryId },
        data: { status },
        include: {
          warehouses: true,
          users: { select: { id: true, name: true } },
          delivery_items: { include: { products: true, locations: true } },
        },
      });
    });

    res.json(delivery);
  } catch (error: any) {
    if (error.message?.startsWith('INSUFFICIENT_STOCK:')) {
      res.status(400).json({ error: `Insufficient stock for product: ${error.message.split(':')[1]}` });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Delivery not found' });
      return;
    }
    console.error('Update delivery status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { warehouseId, customerName, date, notes, items } = req.body;

    if (!warehouseId || !date || !items?.length) {
      res.status(400).json({ error: 'warehouseId, date, and items are required' });
      return;
    }

    const deliveryId = parseInt(id);

    const deliveryCheck = await prisma.deliveryOrder.findUnique({ where: { id: deliveryId } });
    if (!deliveryCheck) {
      res.status(404).json({ error: 'Delivery not found' });
      return;
    }
    if (deliveryCheck.status === 'done' || deliveryCheck.status === 'cancelled') {
      res.status(409).json({
        error: `Cannot edit a ${deliveryCheck.status} delivery. Create a stock adjustment to correct stock levels.`,
      });
      return;
    }

    // Draft/waiting/ready — no stock moves exist, just swap items
    const updatedDelivery = await prisma.$transaction(async (tx) => {
      await tx.deliveryItem.deleteMany({ where: { delivery_id: deliveryId } });

      return tx.deliveryOrder.update({
        where: { id: deliveryId },
        data: {
          warehouse_id: parseInt(warehouseId),
          customer_name: customerName || null,
          created_at: new Date(date),
          delivery_items: {
            create: items.map((item: any) => ({
              product_id: parseInt(item.productId),
              location_id: parseInt(item.locationId),
              quantity: parseFloat(item.quantity),
            })),
          },
        },
        include: {
          delivery_items: { include: { products: true, locations: true } },
          warehouses: true,
          users: { select: { id: true, name: true } },
        },
      });
    });

    res.json(updatedDelivery);
  } catch (error: any) {
    console.error('Update delivery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
