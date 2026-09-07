import { Router } from 'express';
import { getUnits, createUnit } from '../controllers/misc.controller';
import { authenticate } from '../middleware/auth.middleware';
const router = Router();
router.use(authenticate as any);
router.get('/', getUnits as any);
router.post('/', createUnit as any);
export default router;
