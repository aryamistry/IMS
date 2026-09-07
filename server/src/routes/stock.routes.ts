import { Router } from 'express';
import { getStock, getLowStock, getStockHistory, getDashboardStats } from '../controllers/stock.controller';
import { authenticate } from '../middleware/auth.middleware';
const router = Router();
router.use(authenticate as any);
router.get('/dashboard', getDashboardStats as any);
router.get('/low', getLowStock as any);
router.get('/history', getStockHistory as any);
router.get('/', getStock as any);
export default router;

