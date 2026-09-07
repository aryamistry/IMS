import { Request, Response } from 'express';
import prisma from '../utils/prisma';

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

export const createTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromWarehouseId, toWarehouseId, date, notes, items } = req.body;

    if (!fromWarehouseId || !toWarehouseId || !date || !items?.length) {
      res.status(400).json({ error: 'fromWarehouseId, toWarehouseId, date, and items are required' });
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      res.status(400).json({ error: 'Source and destination warehouses must be different' });
      return;
    }

    // Validate sufficient stock
    for (const item of items) {
      const balance = await prisma.stockBalance.findUnique({
        where: {
          product_id_location_id: {
            product_id: item.productId,
            location_id: item.fromLocationId,
          },
        },
      });

      if (!balance || Number(balance.quantity) < item.quantity) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        res.status(400).json({
          error: `Insufficient stock for transfer: ${product?.name}`,
        });
        return;
      }
    }

    const reference = `TRF-${Date.now()}`;

    const transfer = await prisma.$transaction(async (tx) => {
      const newTransfer = await tx.transfer.create({
        data: {
          reference_no: reference,
          from_warehouse: fromWarehouseId,
          to_warehouse: toWarehouseId,
          created_at: new Date(date),
          status: 'done',
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

      for (const item of items) {
        // Deduct from source
        await tx.stockBalance.update({
          where: {
            product_id_location_id: {
              product_id: item.productId,
              location_id: item.fromLocationId,
            },
          },
          data: { quantity: { decrement: item.quantity } },
        });

        // Add to destination
        await tx.stockBalance.upsert({
          where: {
            product_id_location_id: {
              product_id: item.productId,
              location_id: item.toLocationId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            product_id: item.productId,
            location_id: item.toLocationId,
            quantity: item.quantity,
          },
        });

        // Stock move record
        await tx.stockMove.create({
          data: {
            product_id: item.productId,
            from_location: item.fromLocationId,
            to_location: item.toLocationId,
            quantity: item.quantity,
            move_type: 'transfer',
            reference_table: 'transfers',
            reference_id: newTransfer.id,
          },
        });
      }

      return newTransfer;
    });

    res.status(201).json(transfer);
  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
