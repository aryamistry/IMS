import { Router } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
const router = Router();
router.use(authenticate as any);
router.get('/', getProducts as any);
router.post('/', createProduct as any);
router.put('/:id', updateProduct as any);
router.delete('/:id', deleteProduct as any);
export default router;

