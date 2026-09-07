import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      include: {
        product_categories: true,
        units_of_measure: true,
        stock_balances: {
          include: { locations: { include: { warehouses: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    }) as any[];

    const result = products.map((p) => ({
      ...p,
      totalStock: (p as any).stock_balances.reduce((sum: number, sb: any) => sum + Number(sb.quantity), 0),
    }));

    res.json(result);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, sku, description, categoryId, unitId, reorderLevel } = req.body;

    if (!name || !sku || !categoryId || !unitId) {
      res.status(400).json({ error: 'name, sku, categoryId, unitId are required' });
      return;
    }

    const product = await prisma.product.create({
      data: { name, sku, description, category_id: categoryId, unit_id: unitId, reorder_level: reorderLevel || 0 },
      include: { product_categories: true, units_of_measure: true },
    });

    res.status(201).json(product);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'SKU already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, sku, description, categoryId, unitId, reorderLevel } = req.body;

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { name, sku, description, category_id: categoryId, unit_id: unitId, reorder_level: reorderLevel },
      include: { product_categories: true, units_of_measure: true },
    });

    res.json(product);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const productId = parseInt(id);

    // Use a transaction to delete all related records first, then the product
    await prisma.$transaction(async (tx) => {
      // Delete related stock moves
      await tx.stockMove.deleteMany({ where: { product_id: productId } });
      // Delete related stock balances
      await tx.stockBalance.deleteMany({ where: { product_id: productId } });
      // Delete related receipt items
      await tx.receiptItem.deleteMany({ where: { product_id: productId } });
      // Delete related delivery items
      await tx.deliveryItem.deleteMany({ where: { product_id: productId } });
      // Delete related transfer items
      await tx.transferItem.deleteMany({ where: { product_id: productId } });
      // Delete related adjustment items
      await tx.adjustmentItem.deleteMany({ where: { product_id: productId } });
      // Finally delete the product
      await tx.product.delete({ where: { id: productId } });
    });

    res.json({ message: 'Product deleted' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete product. It may be referenced by other records.' });
  }
};
