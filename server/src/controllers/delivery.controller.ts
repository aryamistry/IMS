import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

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

export const createDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { warehouseId, date, notes, items, customerName } = req.body;
    const userId = req.user!.id;

    if (!warehouseId || !date || !items?.length) {
      res.status(400).json({ error: 'warehouseId, date, and items are required' });
      return;
    }

    // Validate sufficient stock before creating
    for (const item of items) {
      const balance = await prisma.stockBalance.findUnique({
        where: {
          product_id_location_id: {
            product_id: item.productId,
            location_id: item.locationId,
          },
        },
      });

      if (!balance || Number(balance.quantity) < item.quantity) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        res.status(400).json({
          error: `Insufficient stock for product: ${product?.name || item.productId}`,
        });
        return;
      }
    }

    const reference = `DEL-${Date.now()}`;

    const delivery = await prisma.$transaction(async (tx) => {
      const newDelivery = await tx.deliveryOrder.create({
        data: {
          reference_no: reference,
          warehouse_id: warehouseId,
          customer_name: customerName || null,
          created_by: userId,
          created_at: new Date(date),
          status: 'done',
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

      // Decrease stock balances and record stock moves
      for (const item of items) {
        await tx.stockBalance.update({
          where: {
            product_id_location_id: {
              product_id: item.productId,
              location_id: item.locationId,
            },
          },
          data: { quantity: { decrement: item.quantity } },
        });

        await tx.stockMove.create({
          data: {
            product_id: item.productId,
            from_location: item.locationId,
            quantity: item.quantity,
            move_type: 'delivery',
            reference_table: 'delivery_orders',
            reference_id: newDelivery.id,
          },
        });
      }

      return newDelivery;
    });

    res.status(201).json(delivery);
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDeliveryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'waiting', 'ready', 'done', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const delivery = await prisma.deliveryOrder.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        warehouses: true,
        users: { select: { id: true, name: true } },
        delivery_items: { include: { products: true, locations: true } },
      },
    });

    res.json(delivery);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Delivery order not found' });
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

    const updatedDelivery = await prisma.$transaction(async (tx) => {
      // 1. Get old items
      const oldDelivery = await tx.deliveryOrder.findUnique({
        where: { id: deliveryId },
        include: { delivery_items: true }
      });

      if (!oldDelivery) throw new Error('NOT_FOUND');

      // 2. Reverse old stock changes (add back the quantity)
      for (const oldItem of oldDelivery.delivery_items) {
        if (oldItem.product_id && oldItem.location_id && oldItem.quantity) {
          await tx.stockBalance.updateMany({
            where: { product_id: oldItem.product_id, location_id: oldItem.location_id },
            data: { quantity: { increment: oldItem.quantity } }
          });
        }
      }
      
      // Delete old stock moves
      await tx.stockMove.deleteMany({
        where: { reference_table: 'delivery_orders', reference_id: deliveryId }
      });

      // Delete old items
      await tx.deliveryItem.deleteMany({
        where: { delivery_id: deliveryId }
      });

      // 3. Validate new stock items
      for (const item of items) {
        const itemQuantity = parseFloat(item.quantity);
        const pId = parseInt(item.productId);
        const lId = parseInt(item.locationId);

        const balance = await tx.stockBalance.findFirst({
          where: { product_id: pId, location_id: lId }
        });

        if (!balance || Number(balance.quantity) < itemQuantity) {
          const product = await tx.product.findUnique({ where: { id: pId } });
          throw new Error(`INSUFFICIENT_STOCK:${product?.name || pId}`);
        }
      }

      // 4. Update delivery header and add new items
      const newDelivery = await tx.deliveryOrder.update({
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
            }))
          }
        },
        include: {
          delivery_items: { include: { products: true, locations: true } },
          warehouses: true,
          users: { select: { id: true, name: true } }
        }
      });

      // 5. Apply new stock changes (decrement)
      for (const item of items) {
        const itemQuantity = parseFloat(item.quantity);
        const pId = parseInt(item.productId);
        const lId = parseInt(item.locationId);
        
        const stockBalance = await tx.stockBalance.findFirst({
          where: { product_id: pId, location_id: lId }
        });
        if (stockBalance) {
          await tx.stockBalance.update({
            where: { id: stockBalance.id },
            data: { quantity: { decrement: itemQuantity } }
          });
        }

        await tx.stockMove.create({
          data: {
            product_id: pId,
            from_location: lId,
            quantity: itemQuantity,
            move_type: 'delivery',
            reference_table: 'delivery_orders',
            reference_id: deliveryId
          }
        });
      }

      return newDelivery;
    });

    res.json(updatedDelivery);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Delivery not found' });
      return;
    }
    if (error.message.startsWith('INSUFFICIENT_STOCK:')) {
      const pName = error.message.split(':')[1];
      res.status(400).json({ error: `Insufficient stock for product: ${pName}` });
      return;
    }
    console.error('Update delivery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
