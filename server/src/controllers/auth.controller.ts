import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role: user.roles?.role_name ?? null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Look up the "operator" role by name instead of assuming its id.
    // Falls back to any non-admin role, then to the first role that exists,
    // so this doesn't break if roles get re-seeded in a different order.
    let defaultRole = await prisma.role.findFirst({
      where: { role_name: "operator" },
    });
    if (!defaultRole) {
      defaultRole = await prisma.role.findFirst({
        where: { role_name: { not: "admin" } },
      });
    }
    if (!defaultRole) {
      defaultRole = await prisma.role.findFirst();
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: hashedPassword,
        role_id: defaultRole?.id ?? null,
      },
      include: { roles: true },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role: user.roles?.role_name ?? null,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    // Assuming auth middleware sets req.user
    const userId = req.user!.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role: user.roles?.role_name ?? null,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
