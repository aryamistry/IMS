/**
 * Issue E — OTP-based password reset (demo version).
 *
 * OTP delivery: the 6-digit code is printed to the SERVER CONSOLE (stderr) instead of
 * being emailed. For production, swap the console.log call for a nodemailer / SendGrid
 * call that emails the code to the user.
 */
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';

const OTP_TTL_MINUTES = 10;

/** POST /api/auth/forgot-password  { email } */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 so we don't leak which emails are registered
    if (!user) {
      res.json({ message: 'If that email exists, an OTP has been sent.' });
      return;
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // Invalidate any existing OTPs for this user
    await prisma.$executeRawUnsafe(
      `DELETE FROM password_resets WHERE user_id = ?`,
      user.id,
    );

    // Store new OTP
    await prisma.$executeRawUnsafe(
      `INSERT INTO password_resets (user_id, otp, expires_at, used) VALUES (?, ?, ?, 0)`,
      user.id,
      otp,
      expiresAt,
    );

    // ── DEMO: log to console instead of emailing ────────────────────────────
    console.log(`\n[PASSWORD RESET OTP] email=${email}  otp=${otp}  expires=${expiresAt.toISOString()}\n`);
    // ── TO ENABLE REAL EMAIL: replace the console.log above with:
    //    await sendMail({ to: email, subject: 'Your reset code', text: `Your OTP is ${otp}` })
    // ────────────────────────────────────────────────────────────────────────

    res.json({ message: 'If that email exists, an OTP has been sent.' });
  } catch (error) {
    console.error('Forgot-password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** POST /api/auth/reset-password  { email, otp, newPassword } */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      res.status(400).json({ error: 'email, otp, and newPassword are required' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    // Look up the latest unused, non-expired OTP for this user
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM password_resets
       WHERE user_id = ? AND used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      user.id,
    );

    if (!rows || rows.length === 0) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const record = rows[0];
    if (String(record.otp) !== String(otp)) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    // Mark OTP as used
    await prisma.$executeRawUnsafe(
      `UPDATE password_resets SET used = 1 WHERE id = ?`,
      record.id,
    );

    // Update the user's password
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hashed },
    });

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset-password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
