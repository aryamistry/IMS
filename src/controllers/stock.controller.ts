import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getStock = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stock = await prisma.stockBalance.findMany({
      include: {
        products: { include: { product_categories: true, units_of_measure: true } },
        locations: { include: { warehouses: true } },
      },
      orderBy: { updated_at: 'desc' },
    });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLowStock = async (_req: Request, res: Response): Promise<void> => {
  try {
    let lowStock: unknown[] = [];
    try {
      lowStock = await prisma.$queryRaw`
        SELECT p.id, p.name, p.sku, p.reorder_level as reorderLevel,
               SUM(sb.quantity) as totalStock,
               pc.category_name as categoryName
        FROM stock_balances sb
        JOIN products p ON p.id = sb.product_id
        JOIN product_categories pc ON pc.id = p.category_id
        WHERE sb.quantity <= p.reorder_level
        GROUP BY p.id, p.name, p.sku, p.reorder_level, pc.category_name
        ORDER BY totalStock ASC
      `;
    } catch (error) {
      console.error('Low stock list query failed:', error);
    }
    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStockHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await prisma.stockMove.findMany({
      take: limit,
      include: {
        products: true,
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalProducts,
      totalWarehouses,
      totalSuppliers,
      recentMoves,
      stockSummary,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.warehouse.count(),
      prisma.supplier.count(),
      prisma.stockMove.findMany({
        take: 10,
        include: {
          products: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.stockBalance.aggregate({ _sum: { quantity: true } }),
    ]);

    let lowStockAlerts = 0;
    try {
      const lowStockCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM (
          SELECT p.id FROM stock_balances sb
          JOIN products p ON p.id = sb.product_id
          GROUP BY p.id
          HAVING SUM(sb.quantity) <= p.reorder_level
        ) t
      `;
      lowStockAlerts = Number(lowStockCount[0]?.count || 0);
    } catch (error) {
      console.error('Low stock count query failed:', error);
    }

    let categoryStock: unknown[] = [];
    try {
      categoryStock = await prisma.$queryRaw`
        SELECT pc.category_name as category, SUM(sb.quantity) as total
        FROM stock_balances sb
        JOIN products p ON p.id = sb.product_id
        JOIN product_categories pc ON pc.id = p.category_id
        GROUP BY pc.id, pc.category_name
        ORDER BY total DESC
        LIMIT 8
      `;
    } catch (error) {
      console.error('Category stock query failed:', error);
    }

    const movementTrend = await prisma.$queryRaw`
      SELECT DATE(created_at) as date,
             SUM(CASE WHEN move_type = 'receipt' THEN quantity ELSE 0 END) as receipts,
             SUM(CASE WHEN move_type = 'delivery' THEN ABS(quantity) ELSE 0 END) as deliveries
      FROM stock_moves
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json({
      totalProducts,
      totalWarehouses,
      totalSuppliers,
      totalStock: Number(stockSummary._sum.quantity || 0),
      lowStockAlerts,
      recentMoves,
      categoryStock,
      movementTrend,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
