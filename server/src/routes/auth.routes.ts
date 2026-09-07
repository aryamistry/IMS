import { Router } from "express";
import { login, register, me } from "../controllers/auth.controller";
import { forgotPassword, resetPassword } from "../controllers/password-reset.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", login as any);
router.post("/register", register as any);
router.get("/me", authenticate as any, me as any);
// Issue E: OTP password reset
router.post("/forgot-password", forgotPassword as any);
router.post("/reset-password", resetPassword as any);

export default router;