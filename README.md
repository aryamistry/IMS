# WarehouseOS — Full Stack Inventory Management System

A modern, production-ready warehouse inventory management system built with React, Node.js, Prisma, and MySQL.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | Zustand (auth), TanStack Query (server state) |
| Backend | Node.js, Express.js, TypeScript |
| ORM | Prisma |
| Database | MySQL |
| Auth | JWT + bcrypt |
| Charts | Recharts |

---

## Project Structure

```
warehouse-app/
├── server/                  # Express backend
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── routes/          # Express routers
│   │   ├── middleware/      # Auth middleware
│   │   └── utils/           # Prisma client
│   └── prisma/
│       ├── schema.prisma    # Database schema
│       └── seed.ts          # Seed data
└── client/                  # React frontend
    └── src/
        ├── pages/           # Page components
        ├── components/      # Reusable UI
        ├── hooks/           # React Query hooks
        ├── store/           # Zustand stores
        ├── lib/             # API client
        └── types/           # TypeScript types
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8+ running locally
- npm or yarn

### 1. Database Setup

Create a MySQL database:
```sql
CREATE DATABASE warehouse_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Copy env file and configure
cp .env.example .env
# Edit .env: set DATABASE_URL with your MySQL credentials

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial data
npm run db:seed

# Start dev server
npm run dev
```

Server runs at: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Default Login

```
Email:    admin@warehouse.com
Password: password123
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register user |
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| GET | `/api/receipts` | List receipts |
| POST | `/api/receipts` | Create receipt (adds stock) |
| GET | `/api/deliveries` | List deliveries |
| POST | `/api/deliveries` | Create delivery (deducts stock) |
| GET | `/api/transfers` | List transfers |
| POST | `/api/transfers` | Execute transfer |
| GET | `/api/stock` | All stock balances |
| GET | `/api/stock/low` | Low stock alerts |
| GET | `/api/stock/history` | Movement history |
| GET | `/api/stock/dashboard` | Dashboard statistics |
| GET | `/api/warehouses` | List warehouses |
| GET | `/api/suppliers` | List suppliers |
| GET | `/api/categories` | List categories |

---

## Key Features

- **Dashboard** — Real-time KPIs, stock movement trend chart, category distribution, recent activity feed
- **Products** — Full CRUD with category/unit assignment and reorder level alerts
- **Receipts** — Multi-line item receipt creation with automatic stock increase and move recording
- **Deliveries** — Delivery order creation with real-time stock availability validation
- **Transfers** — Inter-warehouse stock transfers with source/destination location selection
- **Stock** — Current balances, low stock alerts, full movement history with pagination
- **Suppliers** — Supplier directory management

---

## Business Logic

All inventory operations run in **Prisma transactions** to ensure data consistency:

- **Receipt** → Creates receipt + items → Increments `stock_balances` → Records `stock_moves` (type: `receipt`)
- **Delivery** → Validates sufficient stock → Creates delivery + items → Decrements `stock_balances` → Records `stock_moves` (type: `delivery`)
- **Transfer** → Validates source stock → Moves between locations → Updates both `stock_balances` → Records two `stock_moves` (type: `transfer`)

---

## Environment Variables

### Server `.env`
```
DATABASE_URL="mysql://root:password@localhost:3306/warehouse_db"
JWT_SECRET="change-this-to-a-secure-random-string"
PORT=5000
NODE_ENV=development
```
