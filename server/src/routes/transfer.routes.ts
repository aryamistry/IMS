import { Router } from 'express';
import { getTransfers, createTransfer, updateTransferStatus } from '../controllers/transfer.controller';
import { authenticate } from '../middleware/auth.middleware';
const router = Router();
router.use(authenticate as any);
router.get('/', getTransfers as any);
router.post('/', createTransfer as any);
router.put('/:id/status', updateTransferStatus as any);
export default router;
