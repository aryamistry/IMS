import { Router } from 'express';
import { getWarehouses, createWarehouse, createLocation } from '../controllers/misc.controller';
import { authenticate } from '../middleware/auth.middleware';
const router = Router();
router.use(authenticate as any);
router.get('/', getWarehouses as any);
router.post('/', createWarehouse as any);
router.post('/:id/locations', createLocation as any);
export default router;
