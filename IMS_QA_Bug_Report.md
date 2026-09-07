# IMS (WarehouseOS) — QA & Code Review Report

**Stack:** React + Vite + TS (client) / Express + Prisma + MySQL (server)
**Method:** Full read-through of every controller, route, page, and the Prisma schema; `npm install` + `tsc --noEmit` on both client and server; cross-checked every flow against your Problem Statement (PS).

**Build check result:** Client compiles clean (`tsc --noEmit` → 0 errors). Server couldn't fully build in this sandbox because `prisma generate` needs to download an engine binary and my sandbox's network is locked to a domain allowlist that doesn't include Prisma's binary host — that's an environment limitation on my end, not a bug in your code. Run `npx prisma generate && npx tsc --noEmit` yourself to confirm; the code itself doesn't show any red flags for that.

---

## 🔴 Critical — breaks core functionality

### 1. Status field is completely disconnected from stock movement
`createReceipt`, `createDelivery`, and `createTransfer` all hardcode `status: 'done'` and move the stock **immediately at creation**. But the Receipts page still gives you a live dropdown (Draft/Waiting/Ready/Done/Cancelled) that calls `PUT /receipts/:id/status` — and that endpoint **only** updates the `status` column. It never touches `stock_balances` or `stock_moves`.

Net effect: you can create a receipt (stock +50 immediately), flip it to "Cancelled" in the UI, and the +50 units silently stay in stock forever. Flip it back to "Done" and nothing happens either, because stock already moved. The status dropdown is cosmetic — it actively misleads whoever's using it.
- `server/src/controllers/receipt.controller.ts` (`createReceipt`, `updateReceiptStatus`)
- `server/src/controllers/delivery.controller.ts` (same pattern)
- Deliveries don't even expose the status dropdown in the UI (`useUpdateDeliveryStatus` is defined in `hooks/useApi.ts` but never called from `DeliveriesPage.tsx`), so it's inconsistent between the two pages too.

**Fix direction:** decide once — either (a) drop the draft/waiting/ready pretense and just call everything "done" at creation (simplest, matches current behavior), or (b) actually implement the PS workflow: create as `draft`, only touch `stock_balances`/`stock_moves` inside `updateStatus` when the new status is `done`, and reverse them when a `done` record is cancelled. For a college demo, (b) is what your PS literally describes ("Create → Validate → stock increases"), so I'd do that.

### 2. Internal Transfers can't do the exact thing your PS uses as an example
Your PS's own example is **"Rack A → Rack B"** (same warehouse, different locations). But both the frontend (`TransfersPage.tsx`, line ~49) and backend (`transfer.controller.ts`, `createTransfer`) explicitly reject the request when `fromWarehouseId === toWarehouseId`. So the single simplest, most common internal transfer — moving stock between two shelves in the same warehouse — is impossible. Only cross-warehouse transfers work.

**Fix:** validate `fromLocationId !== toLocationId` instead of comparing warehouse IDs (a transfer where both product+location are literally identical is the only case worth blocking).

### 3. You cannot create the very first product from a fresh database
`ProductsPage.tsx` builds its "Unit of Measure" dropdown by scanning **existing products** for whichever units they happen to use (`unitsMap` from `products.forEach(...)`). There is no `/api/units` endpoint anywhere on the server, no `useUnits()` hook, and no "manage units" screen. On a brand-new DB with zero products, that dropdown is empty, `unitId` stays blank, and `createProduct` will 400 because `unitId` is required. It only appears to work in your seed data because the seed script inserts `units_of_measure` rows directly via Prisma, bypassing the app entirely.

Even with seed data: if every product using a given unit gets deleted or edited, that unit silently disappears from the dropdown forever, even though the row is still in the DB. There's no way to add a *new* unit of measure through the app, period.

**Fix:** add a real `units_of_measure` CRUD endpoint (`GET/POST /api/units`) and a `useUnits()` hook, same pattern as categories.

### 4. Stock Adjustments (a named core feature) doesn't exist anywhere
Your PS lists this as Core Feature #5. There is no `adjustment.controller.ts`, no `adjustment.routes.ts`, nothing mounted in `index.ts`, and no page/route on the client (not even in the sidebar). The `Adjustment`/`AdjustmentItem` Prisma models exist, but nothing ever writes to them. If a professor asks you to demo "fix a stock mismatch," there's literally no button for it.

### 5. Deleting a product destroys historical records, not just the product
`product.controller.ts`'s `deleteProduct` runs a transaction that deletes **all** `stock_moves`, `receipt_items`, `delivery_items`, `transfer_items`, and `adjustment_items` for that product before deleting it. That means an old, already-`done` Receipt or Delivery that references the deleted product will still exist in the list, but its line items vanish — its "3 line items" badge might now say "1 line item," and the audit trail ("Everything logged in the Stock Ledger" per your PS) is permanently corrupted. For an inventory system, the ledger should be append-only; a product being discontinued shouldn't rewrite history.

**Fix:** don't hard-delete referenced products. Add an `is_active`/`archived` flag on `Product` and filter archived products out of the "create new receipt/delivery" dropdowns, while keeping them visible in historical records.

---

## 🟠 Major — logic bugs / PS gaps that will look bad live

### 6. Deliveries never show as negative in stock history / dashboard "Recent Activity"
`stock_moves.quantity` is stored as a **positive** number for every move type, including deliveries (`delivery.controller.ts`: `quantity: item.quantity`, never negated). But `DashboardPage.tsx`'s "Recent Activity" list and `StockPage.tsx`'s "Movement History" tab both color/sign the row using `Number(move.quantity) > 0 ? 'green +' : 'red -'`. Since it's never negative, **every single move — receipts, deliveries, transfers — renders green with a "+" prefix.** The only reason your dashboard's trend chart looks correct is that it separately hardcodes logic per `move_type` in a raw SQL query; the two features disagree with each other.

**Fix:** either store delivery quantities as negative in `stock_moves`, or key the sign/color off `move_type` instead of the raw number, consistently everywhere it's used.

### 7. `StatusBadge` component doesn't know your actual status values
`components/ui/index.tsx`'s `StatusBadge` maps colors for `completed` / `pending` / `cancelled`. Your actual enum values (used by Transfers and Deliveries) are `draft` / `waiting` / `ready` / `done` / `cancelled`. So every transfer/delivery except a cancelled one falls through to the generic gray badge — "Done" and "Draft" look visually identical. Small thing, but very visible in a demo since it's on every list.

### 8. Dashboard is missing the KPIs your PS explicitly asks for
PS says the dashboard should show: Total Products in Stock, Low/Out of Stock, **Pending Receipts, Pending Deliveries, Internal Transfers Scheduled**, plus **dynamic filters** by document type/status/warehouse/category. `getDashboardStats` (server) and `DashboardPage.tsx` (client) currently return: total product count, total stock, low-stock count, warehouse count, supplier count, a movement trend chart, and a category pie chart. None of the three "Pending X" counts exist, and there are no filters at all. Given bug #1, "pending" counts would currently always be 0 anyway (everything is created as `done`), so this ties directly back to fixing the status workflow first.

### 9. "Settings → Warehouse" and "My Profile" are dead links
The sidebar renders a `Settings` `NavLink` to `/settings`, and the PS calls for a Profile menu item, but `App.tsx` has no `<Route path="settings">` and no profile route at all. Clicking Settings falls through to the catch-all route and silently redirects to `/dashboard` — it'll look like the button does nothing, which is worse than not having the button. Same for the user's name/avatar block in the sidebar footer — it's not clickable and there's no page behind it.

### 10. No way to add a Location to a Warehouse after initial seeding
Every receipt/delivery/transfer needs to pick a `locationId` under the chosen warehouse, but there is no endpoint to create a `Location` (only `createWarehouse` exists in `misc.controller.ts`, and it doesn't accept/create locations). Once you've used up the 5 seeded shelves in "Main Warehouse," you're stuck — you can't add "Shelf C-01" without going into the DB directly. For a live demo where a professor says "add a new warehouse and show me a receipt into it," you'd hit a wall immediately since the new warehouse has zero locations and no way to create any.

### 11. OTP-based password reset doesn't exist
Your PS explicitly calls this out under Authentication. There's no `forgot-password` route on the client, no "Forgot password?" link on `LoginPage.tsx`, and no corresponding controller/route on the server. If this is asked about in your review, be ready to say it's a known gap rather than getting caught by it live.

### 12. Editing a `done`/`cancelled` record still silently changes stock
`updateReceipt`/`updateDelivery` let you edit line items on *any* receipt/delivery regardless of its status — including ones marked `cancelled`. The reverse-then-reapply stock logic runs unconditionally, so editing a cancelled receipt's quantities will still move real stock. There's no guard like "don't allow edits once status is done or cancelled."

---

## 🟡 Medium — inconsistencies worth fixing

- **Suppliers, Categories, Warehouses have no update/delete.** Only `GET`/`POST` exist for all three (`misc.controller.ts` / `misc.routes`). A typo in a supplier name or warehouse address can never be corrected from the UI.
- **`createCategory` silently drops the `description` field** — it destructures `description` from the body but never saves it (`data: { category_name: name }` only).
- **Negative/zero stock isn't floor-checked on edit.** `updateReceipt`'s "reverse old stock" step does `decrement` with no check that the balance doesn't go negative; there's no DB constraint (`quantity` is a plain nullable `Int`) preventing negative stock from an edit race.
- **No check that a selected `locationId` actually belongs to the selected `warehouseId`** server-side. The UI only offers locations from the chosen warehouse, but nothing stops a raw API call (or a bug in state) from pairing a location with the wrong warehouse.
- **Delivery date input has `min={today}`** (can't backdate a delivery) but the Receipt date input has no such restriction — inconsistent, and also means you can't record a delivery that already happened yesterday, which is a normal real-world case.
- **Login page ships with hardcoded demo credentials pre-filled** in the input state (`admin@warehouse.com` / `password123`). Fine for your own testing, but remove before presenting so it doesn't look like leftover debug code.
- **`isAuthenticated()` only checks that a token exists**, not that it's expired (tokens are 24h). A stale token keeps the route "authenticated" client-side until the next API call 401s and force-redirects — a bit jarring mid-session.
- **Stray files in repo root** (`demo.txt`, `deo.txt`) contain leftover text ("shup", "hello") — remove before showing this to reviewers.

---

## ✅ What's actually solid
- Prisma schema is well-normalized and matches the raw SQL dump exactly.
- `createDelivery`/`updateDelivery` do correctly pre-check stock sufficiency before allowing the operation — good defensive logic.
- Transaction usage (`prisma.$transaction`) around multi-table writes (receipt/delivery/transfer creation) is correct and will keep stock_balances/stock_moves/header rows atomic.
- Auth (JWT + bcrypt) is implemented correctly, and the axios interceptor auto-logout on 401 is a nice touch.
- Client-side TypeScript is fully clean — zero `tsc` errors.

---

## Suggested fix order (biggest demo risk first)
1. **#1 (status↔stock sync)** — this is the one thing a professor testing "create → cancel → check stock" will catch instantly.
2. **#3 (units of measure)** — otherwise a fresh DB can't even create a product on stage.
3. **#2 (same-warehouse transfers)** — it's literally your own PS example.
4. **#4 (adjustments)** — it's a named core feature with zero implementation; even a minimal version (pick product/location, enter counted qty, write the difference to `stock_balances` + log a `stock_moves` row with `move_type: adjustment`) covers the PS requirement.
5. **#5 (product delete corrupting history)** — swap to soft-delete.
6. Then #6–#12 as polish, since they're visible but not demo-blocking on their own.

If you want, I can go implement any of these fixes directly in the code — happy to start with #1 and #4 since those touch the most PS-required functionality.
