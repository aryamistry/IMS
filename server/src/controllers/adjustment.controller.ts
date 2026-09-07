import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAdjustments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const adjustments = await prisma.adjustment.findMany({
      include: {
        adjustment_items: {
          include: { products: true, locations: true },
        },
        users: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(adjustments);
  } catch (error) {
    console.error('Get adjustments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, notes, items } = req.body;
    const userId = req.user!.id;

    if (!date || !items?.length) {
      res.status(400).json({ error: 'date and items are required' });
      return;
    }

    const reference = `ADJ-${Date.now()}`;

    const adjustment = await prisma.$transaction(async (tx) => {
      // Create the adjustment header
      const newAdj = await tx.adjustment.create({
        data: {
          reference_no: reference,
          created_by: userId,
          created_at: new Date(date),
        },
      });

      for (const item of items) {
        const productId = parseInt(item.productId);
        const locationId = parseInt(item.locationId);
        const countedQty = parseFloat(item.countedQty);

        // Get current stock balance
        const current = await tx.stockBalance.findUnique({
          where: { product_id_location_id: { product_id: productId, location_id: locationId } },
        });
        const currentQty = current ? Number(current.quantity) : 0;
        const diff = countedQty - currentQty;

        // Write adjustment item
        await tx.adjustmentItem.create({
          data: {
            adjustment_id: newAdj.id,
            product_id: productId,
            location_id: locationId,
            system_qty: currentQty,
            actual_qty: countedQty,
            difference: diff,
          },
        });

        // Update stock balance
        if (current) {
          await tx.stockBalance.update({
            where: { product_id_location_id: { product_id: productId, location_id: locationId } },
            data: { quantity: countedQty },
          });
        } else {
          await tx.stockBalance.create({
            data: { product_id: productId, location_id: locationId, quantity: countedQty },
          });
        }

        // Record stock move (positive diff = added, negative = removed)
        if (diff !== 0) {
          await tx.stockMove.create({
            data: {
              product_id: productId,
              to_location: diff > 0 ? locationId : null,
              from_location: diff < 0 ? locationId : null,
              quantity: diff, // Store actual diff (can be negative)
              move_type: 'adjustment',
              reference_table: 'adjustments',
              reference_id: newAdj.id,
            },
          });
        }
      }

      return newAdj;
    });

    res.status(201).json(adjustment);
  } catch (error) {
    console.error('Create adjustment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
