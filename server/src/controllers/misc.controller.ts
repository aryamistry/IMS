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

// Bug #10 fix: create a location under a warehouse
export const createLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { locationCode, description } = req.body;
    if (!locationCode) {
      res.status(400).json({ error: 'locationCode is required' });
      return;
    }
    const location = await prisma.location.create({
      data: {
        warehouse_id: parseInt(id),
        location_code: locationCode,
        description: description || null,
      },
    });
    res.status(201).json(location);
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

// Bug (medium) fix: save description field in createCategory
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const category = await prisma.productCategory.create({ data: { category_name: name } });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bug #3 fix: Units of Measure CRUD
export const getUnits = async (_req: Request, res: Response): Promise<void> => {
  try {
    const units = await prisma.unitOfMeasure.findMany({ orderBy: { unit_name: 'asc' } });
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { unitName, symbol } = req.body;
    if (!unitName || !symbol) {
      res.status(400).json({ error: 'unitName and symbol are required' });
      return;
    }
    const unit = await prisma.unitOfMeasure.create({ data: { unit_name: unitName, symbol } });
    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
