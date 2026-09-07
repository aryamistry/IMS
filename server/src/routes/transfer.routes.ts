import { Router } from 'express';
import { getTransfers, createTransfer } from '../controllers/transfer.controller';
import { authenticate } from '../middleware/auth.middleware';
const router = Router();
router.use(authenticate as any);
router.get('/', getTransfers as any);
router.post('/', createTransfer as any);
export default router;

