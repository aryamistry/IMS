import { Router } from 'express';
import { getAdjustments, createAdjustment } from '../controllers/adjustment.controller';
import { authenticate } from '../middleware/auth.middleware';
const router = Router();
router.use(authenticate as any);
router.get('/', getAdjustments as any);
router.post('/', createAdjustment as any);
export default router;
