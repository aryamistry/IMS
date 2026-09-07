import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Warehouse
export const getWarehouses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { locations: true },
      orderBy: { name: 'asc' },
    });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address } = req.body;
    const warehouse = await prisma.warehouse.create({ data: { name, address } });
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Supplier
export const getSuppliers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, address } = req.body;
    const supplier = await prisma.supplier.create({ data: { name, email, phone, address } });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Categories
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.productCategory.findMany({ orderBy: { category_name: 'asc' } });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const category = await prisma.productCategory.create({ data: { category_name: name } });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
