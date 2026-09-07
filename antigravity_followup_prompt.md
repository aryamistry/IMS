You previously "fixed" 14 bugs from IMS_QA_Bug_Report.md. Your own walkthrough has gaps and one internal contradiction. Fix all of the following. Do not mark anything as done unless you can point to the exact file/line that proves it.

---

## ISSUE A — Bug #1 fix contradicts Bug #8 fix (fix this first, it affects everything else)

You made `createReceipt`, `createDelivery`, and `createTransfer` hardcode `status: 'done'` at creation and blocked any status change away from `done`/`cancelled`. Then separately, for Bug #8, you added dashboard KPI cards for "Pending Receipts," "Pending Deliveries," and "Internal Transfers Scheduled" that count records NOT in `done`/`cancelled` status.

If every record is created as `done`, those three KPI cards will always show 0 — permanently dead UI.

**Fix required:**
1. Change `createReceipt`, `createDelivery`, and `createTransfer` to create records with `status: 'draft'` by default (accept an optional `status` field in the request body if the client wants to create it directly as `done`, otherwise default to `draft`).
2. Only apply stock changes (increment/decrement `stock_balances`, create `stock_moves` rows) when a record's status is set to `done` — either at creation (if created directly as `done`) or via `updateReceiptStatus`/`updateDeliveryStatus`/a new `updateTransferStatus` transitioning INTO `done`.
3. If a `done` record is then moved to `cancelled`, reverse the stock changes (decrement what was incremented, and vice versa).
4. Re-apply the "don't allow edits to done/cancelled records" rule from your Bug #1 fix, but now it should apply to records that reach `done` via status transition, not just ones created that way.
5. `transfer.controller.ts` currently has no `updateTransferStatus` endpoint at all — add one, matching the pattern used for receipts/deliveries, with the same stock-reversal logic on cancel.
6. After this change, verify: create a receipt → dashboard "Pending Receipts" shows 1 → update its status to `done` → stock increases AND "Pending Receipts" drops back to 0.

---

## ISSUE B — Bug #9: Settings page doesn't do what the PS requires

The PS requires **Settings → Warehouse management** (add/edit warehouses and their locations). Your fix built a page that shows "the logged-in user's profile and app info" — that's a Profile page, not Settings.

**Fix required:**
1. Keep the profile info if you want, but the primary content of `SettingsPage.tsx` must be warehouse + location management:
   - List all warehouses with their locations.
   - A form/button to create a new warehouse (`name`, `address`) — call the existing `createWarehouse` endpoint.
   - A form/button to add a new location to an existing warehouse (`location_code`, `description`) — this depends on ISSUE C below being finished first.
2. Add a separate `/profile` route + a minimal `ProfilePage.tsx` (name, email, role) if you still want a profile view, and link the sidebar's user avatar/name block (bottom of `Sidebar.tsx`) to it — right now that block is not clickable and goes nowhere.

---

## ISSUE C — Bug #10 is backend-only; there is still no way to add a location from the UI

Your own walkthrough admits this: *"The WarehousesPage (if it exists or is added) can call this hook."* No page/form was actually built. The `POST /api/warehouses/:id/locations` endpoint and `useCreateLocation()` hook exist but nothing calls them.

**Fix required:**
1. Inside the Settings page from ISSUE B, add an inline "Add Location" form under each warehouse (fields: `location_code`, optional `description`) that calls `useCreateLocation()`.
2. On success, invalidate the `warehouses` query so the new location immediately appears in the Receipts/Deliveries/Transfers location dropdowns without a page refresh.
3. Verify end-to-end: go to Settings → add a location to an existing warehouse → go to Receipts → New Receipt → select that warehouse → confirm the new location appears in the location dropdown.

---

## ISSUE D — Bug #3: confirm "add new unit of measure" actually has a UI, not just a hook

You added `useCreateUnit()` but your walkthrough only confirms `ProductsPage.tsx` now READS units via `useUnits()`. It's unclear if anything calls `useCreateUnit()`.

**Fix required:**
1. If no UI calls `useCreateUnit()` yet, add a small "+ Add new unit" option inside the Unit of Measure dropdown on the product create/edit form (e.g., an "Add new..." option that reveals two inline inputs: `unit_name`, `symbol`, with a Save button calling `useCreateUnit()`).
2. On success, invalidate the `units` query so the new unit appears in the dropdown immediately and gets selected.

---

## ISSUE E — Missing entirely: OTP-based password reset

This was flagged as a gap in the original QA report and was never addressed. The PS explicitly requires it under Authentication.

**Fix required (minimum viable version for a college demo, not production-grade):**
1. Server: add `POST /api/auth/forgot-password` (accepts `email`, generates a 6-digit OTP, stores it with a short expiry — e.g. a new `PasswordReset` table with `user_id`, `otp`, `expires_at` — and logs it to the server console instead of actually sending an email, since real email delivery isn't required for the demo).
2. Server: add `POST /api/auth/reset-password` (accepts `email`, `otp`, `newPassword`; validates the OTP hasn't expired and matches; updates `password_hash`).
3. Client: add a "Forgot password?" link on `LoginPage.tsx` leading to a simple two-step form (enter email → receive OTP via console/toast for demo purposes → enter OTP + new password).
4. Note in your response that OTP delivery is console-logged/mocked for the demo and explain in one sentence how you'd swap in real email delivery (e.g. nodemailer) later.

---

## ISSUE F — Confirm (don't assume) the auto-admin-on-signup fix is actually applied

Separately from the QA report, `register` in `auth.controller.ts` was hardcoding `role_id: 1`, which mapped to the `admin` role because of seed order — meaning every new signup became an admin. A fix was given (look up the `operator` role by name with fallbacks) but it's unclear if it was ever applied to this codebase, since it wasn't part of your original 14-bug walkthrough.

**Fix required:**
1. Open `server/src/controllers/auth.controller.ts` and check the `register` function's `role_id` assignment.
2. If it still hardcodes `role_id: 1`, replace it with a lookup: find role by `role_name: 'operator'` first, fall back to any role that isn't `'admin'`, fall back to the first role that exists.
3. Confirm by registering a new test user and checking their `role_id` does not equal the admin role's id.

---

## Final verification checklist — run these manually and report the actual result of each, not just "done":

1. Register a brand-new user → confirm their role is NOT admin.
2. Create a receipt → confirm it shows under "Pending Receipts" on the dashboard, NOT already counted as stock-in.
3. Update that receipt's status to `done` → confirm stock increases AND the "Pending Receipts" count drops.
4. Try to edit a `done` receipt → confirm it's blocked (409).
5. Cancel a `done` receipt → confirm stock is reversed.
6. Create a transfer between two locations in the SAME warehouse → confirm it succeeds.
7. Go to Settings → confirm warehouse + location management UI exists (not just a profile view) → add a new location → confirm it appears in a receipt's location dropdown without a refresh.
8. On the product form, add a brand-new unit of measure that didn't exist before → confirm it saves and is selectable.
9. Use "Forgot password" on the login page → complete an OTP reset end-to-end → log in with the new password.
10. Confirm StatusBadge colors are distinct for draft/waiting/ready/done/cancelled (not just cancelled being the only one that's colored).

Report back file-by-file what changed for each issue (A–F), same format as your original walkthrough.
