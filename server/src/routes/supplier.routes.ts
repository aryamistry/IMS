import { Router } from 'express';
import { getSuppliers, createSupplier } from '../controllers/misc.controller';
import { authenticate } from '../middleware/auth.middleware';
const router = Router();
router.use(authenticate as any);
router.get('/', getSuppliers as any);
router.post('/', createSupplier as any);
export default router;

