import { Router } from 'express';
import { getCategories, createCategory } from '../controllers/misc.controller';
import { authenticate } from '../middleware/auth.middleware';
const router = Router();
router.use(authenticate as any);
router.get('/', getCategories as any);
router.post('/', createCategory as any);
export default router;

