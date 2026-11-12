# IT Inventory Application: Recent Changes

This covers the last three commits on `main`, oldest first, then the setup work done outside the code and the changes made after them (not yet committed):

| Commit | Date | Summary |
| --- | --- | --- |
| `e7d67a0` | 2026-11-09 | Narrowed scope to stock inventory, dropped the asset/software tables, single root `.env`, Neon-ready database client |
| `7c02d40` | 2026-11-09 | Neon agent skills and MCP config; moved Render to the same region as Neon |
| `0c9e36f` | 2026-11-10 | Inventory management UI: add stock, check out/return/recount, vendors, purchase orders, CSV reports, settings, search and alerts |
| `a816ef0` | 2026-11-11 | Sign-in and sign-up, editing and deleting, item history, shared settings, phone layout, faster loading, browser tests (branch `feature/auth-editing-settings`) |
| *(uncommitted)* | 2026-11-11 | Hosting moved from Render to Netlify Functions; sign-in, sign-up and user management removed |

Where something is already documented, this file links to that document instead of repeating it. Section 4 covers connecting to Neon and loading the data. Section 5 covers commit `a816ef0`. Section 6 covers the move from Render to Netlify. Section 7 covers removing sign-in. Section 8 lists existing docs that are now out of date.

## 1. `e7d67a0`: Inventory-only scope and Neon-ready configuration

### 1.1 Scope change

Individually tracked assets, end users and software licenses are now out of scope. The app tracks stock quantities only. **Already documented:** the [README](../README.md) intro explains the new scope, and [barcode-scanning-proposal.md §7](barcode-scanning-proposal.md#7-scope-decision-required) describes how to bring per-unit tracking back from git history if needed.

What was removed:

- **Database** (migration [`0002_inventory_only.sql`](../server/migrations/0002_inventory_only.sql)):
  - Dropped the tables `assets`, `asset_events`, `software_licenses` and `software_assignments`.
  - Dropped `catalog_items.lifecycle_months` and `inventory_transactions.related_asset_id`.
  - Existing catalog items of type `asset` or `software` are reclassified as `accessory`, so their stock and purchase history are kept. The `type` check now allows only `consumable` and `accessory`.
- **API**: the routes `/api/assets`, `/api/asset-events`, `/api/software-licenses` and `/api/software-assignments` are gone. Checkout and return no longer accept `relatedAssetId`. Catalog items no longer accept `lifecycleMonths` or the `asset`/`software` types. A location can now be deleted once it has no stock, since there are no assets to check for.
- **Frontend**: removed the Assets, Software, Users and Lifecycle pages and their sidebar links. The Dashboard now shows item types, total/available units, low-stock and out-of-stock counts, units by category, top locations by units, and an "Items Needing Reorder" table instead of asset and end-of-life widgets. The app's name in the header and sidebar changed from "IT Asset Manager" to "IT Inventory".
- **Seed data**: only an IT department. The users are IT staff who operate the system, not tracked end users. Laptop, desktop and software seed rows were replaced with accessories and consumables.
- **Excel importer**: rows with an asset tag or serial number are skipped and counted in `skippedSerializedRows`. **Already documented** in the README ("Everyday database commands").

### 1.2 Configuration and deployment

**Already documented in the [README](../README.md):**

- one `.env` at the project root, shared by the server, the frontend and docker compose
- Neon + Render deployment steps
- TLS behaviour for non-local databases
- the `/api/health` endpoint not touching the database
- `TEST_DATABASE_URL` safety

Details not in the README:

- [`server/src/env.ts`](../server/src/env.ts) loads the root `.env` and works from both `src/` (tsx) and `dist/` (compiled). The server entry point, migrate script and seed script import it instead of `dotenv/config`. [`drizzle.config.ts`](../server/drizzle.config.ts) loads `../.env` itself.
- Connection pool in [`server/src/db/client.ts`](../server/src/db/client.ts):
  - `max: 10`
  - `idleTimeoutMillis: 30s`, so Neon can scale to zero
  - `connectionTimeoutMillis: 15s`, to allow for a Neon cold start
  - a `pool.on("error")` handler, so idle connections that Neon closes don't crash the API
- Test setup now checks `TEST_DATABASE_URL` before `DATABASE_URL`. Before, it was the reverse.
- New [`docker-compose.yml`](../docker-compose.yml) for Postgres 16, with a health check and a named volume.
- [`render.yaml`](../render.yaml) declares `NODE_ENV`, `DATABASE_URL` and `CORS_ORIGIN`.
- New [`public/_redirects`](../public/_redirects) (`/* /index.html 200`) so Netlify serves client-side routes. [low-cost-business-deployment-proposal.md §7](low-cost-business-deployment-proposal.md#7-netlify-configuration) had planned this.
- The `docs/*.md` proposals and `docker-compose.yml` are now committed. Previously they were gitignored, along with `.env.example`, which no longer exists.

## 2. `7c02d40`: Neon tooling

- Added the `neon` and `neon-postgres` agent skills under [`.claude/skills/`](../.claude/skills/), pinned in [`skills-lock.json`](../skills-lock.json) to `neondatabase/agent-skills`.
- Added [`.mcp.json`](../.mcp.json) to register the Neon MCP server (`https://mcp.neon.tech/mcp`). It needs to be authorized before use.
- `.neon` is now gitignored.
- Render region changed from `oregon` to `virginia`, so the API runs in the same region as the Neon database (AWS us-east-1). **Already documented** in the README, deployment step 1.

## 3. `0c9e36f`: Inventory management features

None of this was documented before this file.

### 3.1 New API endpoints

| Method and path | Permission | Behaviour |
| --- | --- | --- |
| `POST /api/stock` | administrator, inventory manager | Starts tracking a catalog item at a location. Body: `catalogItemId`, `locationId`, `quantity` (≥ 0), optional `reorderPoint` and `notes`. If the quantity is above 0, it is recorded as an `adjustment` transaction (default note "Initial stock"). Returns `{ stockItem, transaction }`, where `transaction` is `null` when the quantity is 0. Returns **409** if the item is already stocked at that location. |
| `POST /api/purchase-orders/:id/cancel` | administrator, inventory manager | Cancels an open purchase order. Returns **400** if the order is not `open` or any line has already been received (even partly). |

Both run in a database transaction ([`services/stock.ts`](../server/src/services/stock.ts), [`services/purchaseOrders.ts`](../server/src/services/purchaseOrders.ts)). Tests added: 4 in `stock.test.ts` (create, zero quantity, duplicate, technician blocked) and 3 in `purchaseOrders.test.ts` (cancel, partly received, cancel twice).

### 3.2 Frontend API client ([`src/lib/api.ts`](../src/lib/api.ts))

- New functions: `createVendor`, `createCatalogItem`, `createStockItem`, `checkoutStock`, `returnStock`, `adjustStock` (sets the *total* quantity after a physical count), `createPurchaseOrder`, `receivePurchaseOrder`, `cancelPurchaseOrder`.
- Error messages now include the first field-level Zod validation error, for example `Invalid request: quantity: ...`.

### 3.3 New UI

- **Shared modal** ([`components/Modal.tsx`](../src/components/Modal.tsx)): `Modal` (closes on Escape or a backdrop click), `Field`, `FormError`, and shared input and button classes.
- **Inventory page** ([`components/StockForms.tsx`](../src/components/StockForms.tsx)):
  - *Add Item* adds an existing catalog item, or creates a new one, at a location with a starting quantity, reorder point and unit price.
  - Each row has *Check out*, *Return* and *Recount* buttons. Check out is disabled when nothing is available, and Return when nothing is checked out.
  - New status filter: all / needs reorder / in stock.
- **Purchases page** ([`components/PurchaseOrderForms.tsx`](../src/components/PurchaseOrderForms.tsx)):
  - *New Purchase Order*: multiple lines, unit price filled in from the catalog, running total, and a suggested `PO-<year>-NNN` number.
  - *Receive*: enter quantities per line and choose a location, which defaults to the Settings default location.
  - *Cancel*: asks for confirmation first.
  - Receive and Cancel only appear on open orders.
- **Vendors page**: *Add Vendor* modal with name, category, contact, phone and email. It validates the email and reports a duplicate name.
- **Reports page** ([`lib/reports.ts`](../src/lib/reports.ts)): four CSV downloads, built in the browser with a UTF-8 BOM so Excel opens them correctly:
  - stock on hand
  - low stock
  - stock movement (by date range)
  - purchase history (by date range)
- **Header** ([`components/Header.tsx`](../src/components/Header.tsx)):
  - *Search* across stock, vendors, purchase orders and locations, showing up to 4 results per group. Enter opens the matching inventory search.
  - *Bell* lists low-stock and out-of-stock items, with a link to view all of them in Inventory.
  - *Help* opens a quick guide.
- **Sidebar**: *Contact Support* opens an email to the support address in Settings. If no address is set yet, it opens Settings instead.
- **Dashboard**: quick actions and "View all" links now go to their pages. The value card downloads the stock-on-hand CSV.

### 3.4 Settings stored in the browser ([`lib/settings.ts`](../src/lib/settings.ts))

> **Superseded by §5.3:** settings now live on the server.

There is no settings table on the server yet, so settings are kept in `localStorage` under the key `it-inventory:settings`. They persist on one browser but **are not shared between users or devices**. The fields are:

- organization name
- default location
- currency (USD/CAD/EUR)
- low-stock alerts on/off
- low-stock threshold
- extra categories
- support email

Effects on the rest of the app:

- **Reorder point:** each item uses its own reorder point if it has one, then its catalog item's, then the **Settings threshold** (default 0). Before, the last fallback was always 0.
- **Currency:** all currency formatting uses the chosen currency.
- **Live updates:** `useSettings()` re-renders components when settings change, in this tab or another one.

### 3.5 Links that open dialogs and filters ([`lib/useLinkParams.ts`](../src/lib/useLinkParams.ts))

Pages read one-time query parameters from a link and then remove them from the URL, so reloading the page doesn't repeat them:

- `/inventory?new=1`, `?q=<text>`, `?status=reorder`
- `/purchases?new=1`, `?q=<text>`
- `/locations?new=1`

### 3.6 Smaller fixes in this commit

- **Render build fix:** [`importWorkbook.ts`](../server/src/import/importWorkbook.ts) had a TypeScript error (the early return was missing `skippedSerializedRows: 0`) that made `npm run build` fail, so the Render deploy would have failed.
- **Purchases:** the "Total Spend (2024)" card is now "Total Spend", since it covers all years.
- **New Purchase Order dialog:**
  - The quantity and price inputs no longer squash the item dropdown.
  - The suggested PO number is recalculated once data has loaded, so it can't clash with an existing number when the dialog is opened straight after a page load.
- **Header search:** Enter shows every matching inventory item instead of jumping to the first one.
- **Vendors:** email addresses are `mailto:` links.
- **Settings:** *+ Add Location* opens the Locations page with its add form already open.
- **Lint:** the `react-hooks/set-state-in-effect` errors were fixed. Link parameters are now applied during render (`useLinkParams`), and the header closes its panels by comparing the current page during render.

How it was checked: 46 automated browser checks covering every page and button, run against a throwaway copy of the local database (`it_inventory_uitest`, deleted afterwards). They found no failures and no console errors. All 16 server tests passed.

## 4. Connecting to Neon and loading the data (outside the code)

No code changed for this; it is setup on your machine and in Neon.

- **Neon tooling:** the Neon CLI (`neon`, version 9.2.1) was installed globally, and this folder was linked to Neon project `soft-moon-28816237` (organization `org-muddy-term-98965873`) with `neon link`. That created the gitignored `.neon` file.
- **`.env`:** `DATABASE_URL` now points at the Neon database. `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`, `NEON_BRANCH_ID` and `NEON_FUNCTION_HOST_SUFFIX` were also added. Your previous local `DATABASE_URL` was replaced, so running the API with no other settings now uses **Neon, not Docker**. To work against local data, prefix commands with the local URL, e.g. `DATABASE_URL=postgresql://inventory_app:local_development_password@localhost:5432/it_inventory npm run server:dev`.
- **Neon schema and data:** the migrations were run against Neon, and `IT Inventory Workbook.xlsx` was imported with `--replace`: 59 rows and no errors.
- **The "Unknown or inactive actor" error** had two causes. Before the import, the Neon `users` table was empty, so the old development identity stub (§5.1) had no user to act as. After the import, the API server had stopped, so it was restarted.
- **Migrations 0003 and 0004** were applied to Neon on 2026-11-11 (all 5 migrations now applied; the 59 stock rows were unchanged).
- Render was later dropped in favour of Netlify (§6), so the Render `DATABASE_URL` step no longer applies.

## 5. `a816ef0`: sign-in and sign-up, editing, shared settings, phone layout

### 5.1 Sign-in and permissions

The development stub, where any request without an `x-user-id` header acted as the first active user, has been removed. Every API route except `/api/auth/login` and `/api/health` now needs a signed-in session. **Already documented** in the [README](../README.md#sign-in-and-permissions) (how it works, the role-to-permission table, the lockout rule).

- **Database** (migration [`0003_auth_sessions_settings.sql`](../server/migrations/0003_auth_sessions_settings.sql), additive only):
  - new `users.password_hash` column (nullable; null means the user can't sign in)
  - new `sessions` table
  - new `app_settings` table (§5.3)
- **New endpoints** ([`routes/auth.ts`](../server/src/routes/auth.ts), [`routes/users.ts`](../server/src/routes/users.ts)):

  | Method and path | Permission | Behaviour |
  | --- | --- | --- |
  | `POST /api/auth/login` | none | Body `email` (case-insensitive), `password`. Returns `{ token, expiresAt, user }`. **401** for a wrong password, an unknown email, an inactive user or a user without a password (same message for all). **429** after 10 failures per email or IP in 15 minutes. |
  | `GET /api/auth/me` | signed in | The current user, with their `permission` tier. |
  | `POST /api/auth/logout` | signed in | Ends this session. |
  | `POST /api/auth/change-password` | signed in | Body `currentPassword`, `newPassword` (8+ characters). Signs out all the user's other sessions and returns a new token. |
  | `POST /api/users/:id/password` | administrator | Sets someone's password and signs them out everywhere. |

- **Changed endpoints:**
  - `GET /api/users` no longer sends password hashes. It returns `hasPassword` instead.
  - `POST /api/users` accepts an optional `password`.
  - `PATCH /api/users/:id` signs out a user who is made inactive. An administrator can't deactivate themselves or remove their own administrator role (**400**).
- **First sign-in:** new script `npm run user:set-password -- <email> [--name "Full Name"] [--role "..."]` ([`server/src/scripts/setPassword.ts`](../server/src/scripts/setPassword.ts)). It sets the password for an existing user, or creates the user (as an IT Administrator by default) when `--name` is given. The password is typed at a hidden prompt, or read from `NEW_PASSWORD`.
- **Importer:** `db:import --replace` no longer deletes users and departments. It reuses the existing "Data Importer" user, so re-importing doesn't remove everyone's sign-in.
- **Frontend:**
  - new sign-in page ([`pages/Login.tsx`](../src/pages/Login.tsx))
  - session handling ([`context/AuthContext.tsx`](../src/context/AuthContext.tsx), [`context/authValue.ts`](../src/context/authValue.ts))
  - the token is kept in `localStorage` (`it-inventory:session`)
  - any 401 sends the user back to the sign-in page
  - the header has an account menu with *Change password* and *Sign out*
- **Settings → Users** (administrators only): add users with a role and an optional password, edit name/email/role, deactivate, and set or reset passwords.
- **Sign-up with administrator approval:**
  - The sign-in page has **Sign in** and **Create account** tabs. *Create account* asks for name, email, and a password (8+ characters, typed twice).
  - `POST /api/auth/signup` (no sign-in needed) creates the user with status **`pending`** and role "Viewer". It returns **409** if the email is already used (any letter case), **400** for a short password or bad email, and **429** after 20 sign-ups from one IP address in an hour (`SIGNUPS_PER_HOUR` to change).
  - Signing in to a pending account with the right password returns **403** "waiting for an administrator to approve it". A deactivated account gets "This account has been deactivated". A wrong password still gets the generic message, so neither status is revealed to someone guessing.
  - **Settings → Users** lists pending requests at the top. *Approve* activates the account with the role you pick; *Decline* deletes the request (new `DELETE /api/users/:id`, administrators only, pending accounts only; **409** for anyone else), and that person can apply again.
  - Administrators see the number of waiting requests on the **bell**, with a link to the list.
  - Migration [`0004_user_signup_pending.sql`](../server/migrations/0004_user_signup_pending.sql) adds `pending` to the allowed `users.status` values.
  - The first administrator still comes from `npm run user:set-password`; there's no "first person to sign up becomes admin" rule, because on the live site that could be a stranger.
- **Buttons follow permissions.** Read-only users see no buttons that change data. Technicians see *Check out* and *Return* only. Settings are read-only for anyone below inventory manager.

### 5.2 Editing and deleting

| Endpoint | Behaviour |
| --- | --- |
| `PATCH /api/catalog-items/:id` | Optional fields can now be cleared with `null` (`unitPrice`, `reorderPoint`, `vendorId`, `manufacturer`, `model`). |
| `DELETE /api/catalog-items/:id` *(new)* | **409** if the item has stock, purchase-order lines or history. |
| `PATCH /api/vendors/:id` | `contactName`, `email`, `phone` can be cleared with `null`. |
| `DELETE /api/vendors/:id` *(new)* | **409** if the vendor has purchase orders. Catalog items that named it are kept, with no vendor. |
| `PATCH /api/locations/:id` | `managerUserId`, `notes` can be cleared with `null`. |
| `PATCH /api/stock/:id` *(new)* | Sets or clears (`null`) this location's own `reorderPoint`. |
| `DELETE /api/stock/:id` *(new)* | Stops tracking an item at a location. **409** unless its quantity is 0. Its history is kept. |

All are limited to administrators and inventory managers.

In the UI:
- **Inventory:** each row has an *Edit* (pencil) button. It edits the item's details: name, category, type, vendor, manufacturer, model, **unit price** and reorder point. It also edits this location's own reorder point, and has *Remove from <location>*, which is enabled at quantity 0. This is how to fill in the prices the workbook import didn't have, so *Total Inventory Value* stops showing $0.
- **Inventory → History (clock icon):** every check-out, return, adjustment and receipt for that item at that location, with who did it and the notes.
- **Vendors:** *Edit* and *Delete* (disabled while the vendor has orders).
- **Locations:** the inline add form became an *Add/Edit* dialog that can change the **type** (all imported locations are "Office") and the manager, and delete the location. Delete now asks for confirmation; before, *Remove* deleted immediately.
- **Inventory table:** new *Reorder At* column, and a warning icon next to low and out-of-stock items.

### 5.3 Settings shared on the server

Settings moved from each browser's `localStorage` to the new `app_settings` table, so everyone sees the same values ([`routes/settings.ts`](../server/src/routes/settings.ts)):

- `GET /api/settings` (anyone signed in) returns the settings merged over defaults, plus `saved` (false until first saved).
- `PUT /api/settings` (administrator or inventory manager) validates and saves them.
- **One-time migration:** the first time an administrator or manager loads the app before anyone has saved settings, any settings left in their browser by the old version are saved to the server and removed from the browser.
- **Fix:** opening Settings directly (a reload or a bookmark) used to show default values, because the form was filled in before the settings had loaded.

### 5.4 Consumables page merged into Inventory

The Consumables page duplicated Inventory with fewer features. It is now a *Type* filter on Inventory (All / Consumables / Accessories), and the sidebar link was removed. Old `/consumables` links open `/inventory?type=consumable`.

### 5.5 Phones and tablets

- **Sidebar:** below 1024px wide it becomes a slide-out menu, opened from a ☰ button in the header and closed by navigating, by ✕, or by tapping outside it.
- **Header:** the search box shrinks to fit, and the page title is hidden on phones.
- **Layout:** stat cards, charts and forms stack into fewer columns. Wide tables scroll sideways inside their card instead of widening the page.
- **Checked:** no page scrolls sideways at 390px (iPhone) width.

### 5.6 Performance

- **Loading:** the app no longer downloads the whole transaction history on every load and after every save. That history only grows.
- **"Available" units:** `GET /api/stock` now returns `checkedOut` for each stock line, calculated by one grouped query. Before, the browser scanned every transaction for every row. The server's own checkout and return checks also sum in SQL instead of loading rows.
- **`GET /api/inventory-transactions`:** new filters `catalogItemId`, `locationId`, `from`, `to` (dates, inclusive) and `limit`. Results are newest first. The Stock Movement report and the item history use them to fetch only what they need.

### 5.7 Smaller changes

- **Money:** always shown with cents in the Settings currency (e.g. $70.50). Before, tables rounded to whole dollars ($71) while the order dialog showed 70.50.
- **Lint:** 0 errors and 0 warnings, down from 27 warnings. Pages compute their data directly on each data refresh instead of using `useMemo(..., [revision])`. ESLint also no longer scans the server's compiled `server/dist`.
- **Browser tests in the repo:** [`e2e/app.spec.ts`](../e2e/app.spec.ts) (Playwright), run with `npm run test:e2e`. Setup is in [`e2e/README.md`](../e2e/README.md).
- **README:** documents sign-in, the first-password step for local and Neon setups, and how to try risky changes on a Neon branch.

### 5.8 How it was checked

- **Server tests:** 43 pass, up from 16. The 27 new ones cover sign-up and approval, sign-in, lockout, sign-out, password changes, user management, settings, editing and deleting, `checkedOut`, and transaction filters.
- **Browser tests:** 11 pass (including the full sign-up → approve → sign-in flow) against a throwaway local database (`it_inventory_uitest`), with no console errors.
- **Builds:** frontend typecheck and production build succeed, and so does the server build.
- **Neon:** nothing was run against Neon.

### 5.9 Before deploying

1. Apply migrations `0003` and `0004` to Neon. *(Done on 2026-11-11. Netlify builds now run pending migrations automatically; see §6.)*
2. Create your administrator sign-in on Neon: `npm run user:set-password -- you@example.com --name "Your Name"`. The only user there now is the "Data Importer", which has no password.
3. Add the other staff in **Settings → Users**.

Until the migration runs, the new API code will fail against Neon (missing tables). Until step 2, nobody can sign in.

## 6. Uncommitted: hosting moved from Render to Netlify Functions

Render is no longer used. One Netlify site now serves both the frontend and the API. **Already documented** in the [README](../README.md#deployment-netlify--neon-postgres) (setup steps and notes).

- **New files:**
  - [`netlify.toml`](../netlify.toml): build command, publish folder, functions folder, Node 22, the `/api/*` → function rewrite, and the single-page-app fallback
  - [`netlify/functions/api.ts`](../netlify/functions/api.ts): the function entry point
  - [`server/src/netlify.ts`](../server/src/netlify.ts): wraps the unchanged Express app with `serverless-http` (new server dependency)
- **Removed:**
  - `render.yaml`
  - `public/_redirects`, whose single-page-app rule moved into `netlify.toml`. It had to move: the `/api/*` rule must come before the catch-all, and Netlify applies `_redirects` first.
- **Migrations:** they run during each Netlify build (`npm run db:migrate` in the build command), replacing Render's `preDeployCommand`.
- **Frontend:** the default API address is `/api` in production builds and `http://localhost:4000/api` in development. `VITE_API_URL` still overrides both.
- **Server:**
  - `env.ts` no longer fails when there's no `.env` file to read.
  - The connection pool holds 3 connections inside a function (10 elsewhere); `PG_POOL_MAX` overrides it.
  - Two comments no longer mention Render.
- **CORS:** the app and API share an origin, so `CORS_ORIGIN` isn't needed in production. It's still used locally.
- **How it was checked:** I couldn't run the Netlify CLI, so the function was bundled with esbuild the way Netlify does it, in both CommonJS and ES-module form (with Netlify's `createRequire` shim). Each bundle was called with Netlify-style events against a throwaway local database:
  - health on both path forms: 200
  - stock without a session: 401
  - sign-in: 200
  - stock with a session: 200 (59 rows)
  - sign-up: 201
  - settings: 200

  The real Netlify build hasn't run yet; that happens on the first deploy.

## 7. Uncommitted: sign-in removed

Only two people in the department use the app, so sign-in was removed. **This undoes §5.1** (sign-in, sign-up, approval, user management, permission tiers). The editing, history, shared settings, phone layout and performance work from §5 stays. **Already documented** in the [README](../README.md#access-no-sign-in).

> **Anyone with the site's address can view, change and delete the inventory.** Keep the Netlify link private.

- **Server:**
  - Every request now acts as one shared **"IT Department"** user (`it-department@local.invalid`), which the API creates the first time it runs ([`middleware/auth.ts`](../server/src/middleware/auth.ts)). Transactions still need a user, so the history shows "IT Department" as *By*.
  - Removed: the `/api/auth/*` endpoints; sessions; password hashing; the sign-up and user-management endpoints (`POST`/`PATCH`/`DELETE /api/users`, `POST /api/users/:id/password`); the per-route permission checks; the sign-in rate limits; and the `user:set-password` script.
  - `GET /api/users` stays read-only, for names in the history and location managers.
  - `trust proxy` was removed; it existed only for the sign-in rate limit.
- **Database:** migration [`0005_remove_sign_in.sql`](../server/migrations/0005_remove_sign_in.sql) drops the `sessions` table and the `users.password_hash` column, and turns any leftover `pending` users into `inactive`. It keeps `app_settings`.
  - It has **not** been applied to Neon yet. It runs on the next `npm run db:migrate` or Netlify build.
  - The app works before it's applied too: the new code simply doesn't use those columns.
- **Frontend:**
  - Removed: the sign-in and *Create account* page, the account menu (*Change password*, *Sign out*), Settings → Users and the sign-up requests on the bell.
  - Every button is shown to everyone, since there are no longer permission tiers to hide them by.
  - The API client no longer sends a session token.
- **Tests:**
  - Server: 26 pass. A new [`features.test.ts`](../server/src/test/features.test.ts) covers open access, the shared user, settings, editing and deleting, and history. The sign-in tests were removed with the code.
  - Browser: 8 pass, including a new "opens straight to the Dashboard" test. They no longer need test accounts.

## 8. Existing docs that are now out of date

These docs were not updated by the three commits. They are proposals, so they can stay as historical records, but they no longer describe the code:

- [database-persistence-proposal.md](database-persistence-proposal.md):
  - §4.7, §4.10 and §4.11 describe the tables that were dropped.
  - The endpoint list in §8 still includes asset and software routes, and doesn't include `POST /api/stock` or `POST /api/purchase-orders/:id/cancel`.
- [data-structure-proposal.md](data-structure-proposal.md): §3.3, §3.8 and §3.9 describe serialized assets, software licenses and lifecycle history.
- [excel-import-proposal.md](excel-import-proposal.md): §2 says rows with an asset tag or serial number become `assets` records. They are now skipped.
- [low-cost-business-deployment-proposal.md](low-cost-business-deployment-proposal.md): recommends a Render API and Render PostgreSQL. Production now uses Netlify Functions for the API and Neon for the database (see the README).
- [database-persistence-proposal.md](database-persistence-proposal.md) §8 also lacks the settings endpoints and the new `PATCH`/`DELETE` routes. §10 describes permissions as planned; there is now no sign-in and no permission checks (see §7).
- [barcode-scanning-proposal.md](barcode-scanning-proposal.md) §4.3: updated to drop the `requirePermission` guard, which no longer exists.
