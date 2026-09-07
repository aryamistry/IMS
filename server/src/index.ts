import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import receiptRoutes from "./routes/receipt.routes";
import deliveryRoutes from "./routes/delivery.routes";
import transferRoutes from "./routes/transfer.routes";
import stockRoutes from "./routes/stock.routes";
import warehouseRoutes from "./routes/warehouse.routes";
import supplierRoutes from "./routes/supplier.routes";
import categoryRoutes from "./routes/category.routes";

dotenv.config();

const app = express();
const PORT: number = Number(process.env.PORT) || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route (prevents "Cannot GET /")
app.get("/", (_req: Request, res: Response) => {
  res.send("Warehouse API is running 🚀");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/categories", categoryRoutes);

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
  });
});

// Global error handler
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      error: err.message || "Internal Server Error",
    });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;