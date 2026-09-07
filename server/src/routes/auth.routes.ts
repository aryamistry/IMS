import { Router } from "express";
import { login, register, me } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", login as any);
router.post("/register", register as any);
router.get("/me", authenticate as any, me as any);

export default router;