# IT Inventory Application: Barcode Scanning Proposal

## 1. Purpose

This proposal describes how to add a scan feature to the IT Inventory Application. Scanning an item should add it to the inventory in the database, and the change should appear in the app right away.

It covers two levels of tracking:

- **Phase 1: product barcodes.** A scan identifies a catalog item, such as "Dell USB-C Dock", and increases its quantity at a location. This fits the current quantity-based model.
- **Phase 2: per-unit identifiers (optional).** Every physical unit gets its own database row and a unique asset tag, so a scan identifies one specific dock.

Phase 1 is a small, low-risk change. Phase 2 changes part of the stock model and needs a scope decision first (see section 7).

## 2. Current State

These parts of the existing system are relevant:

- `catalog_items` describes product types. It has no barcode or SKU column, so a scanned code cannot be matched to an item yet.
- `stock_items` holds one quantity per catalog item per location, with `UNIQUE (catalog_item_id, location_id)`.
- `inventory_transactions` is the audit trail. Its `type` check constraint already allows `'receipt'`.
- `receivePurchaseOrder` in `server/src/services/purchaseOrders.ts` already finds or inserts a `stock_items` row and logs a `receipt` transaction in one database transaction.
- On the frontend, `DataProvider` exposes `refresh()`. Pages recompute their selectors when `revision` changes.
- Every table already uses a UUID primary key (`defaultRandom()`), so new rows get unique IDs automatically.

## 3. Scan Flow

```text
scan barcode → GET lookup by barcode
   ├─ found     → choose location + quantity → POST stock-in → DB updated → app refreshes
   └─ not found → "new item" form with the barcode filled in → create catalog item → stock-in
```

## 4. Phase 1: Product Barcodes

### 4.1 Schema change

Add a nullable, unique barcode column to `catalog_items` in `server/src/db/schema.ts`:

```ts
barcode: text("barcode").unique(),
```

The column is nullable, so existing seeded and imported rows stay valid. No backfill is required. Barcodes can be added to existing items when they are first scanned, or through the create/edit form.

Generate and apply the migration:

```bash
npm --prefix server run db:generate
npm run db:migrate
```

Add `barcode: z.string().optional()` to `createSchema` in `server/src/routes/catalogItems.ts`. `updateSchema` then picks it up automatically through `.partial()`.

### 4.2 Lookup endpoint

```ts
catalogItemsRouter.get("/by-barcode/:code", asyncHandler(async (req, res) => {
  const [row] = await db.select().from(catalogItems).where(eq(catalogItems.barcode, req.params.code));
  if (!row) throw new NotFoundError("No item with that barcode");
  res.json(serialize(row));
}));
```

### 4.3 Stock-in endpoint

Add `receiveStock(catalogItemId, locationId, quantity, performedByUserId, notes?)` to `server/src/services/stock.ts`, exposed as `POST /stock/receive`. Copy the find-or-insert logic from `receivePurchaseOrder`:

1. Run everything inside one `db.transaction`.
2. Select the `stock_items` row for `(catalogItemId, locationId)` with `.for("update")`.
3. If the row exists, increase `quantity`. Otherwise, insert a new row.
4. Insert an `inventory_transactions` row with `type: "receipt"` and a null `relatedPurchaseOrderId`. No constraint change is needed.
5. Return `{ stockItem, transaction }`, the same shape as the other stock services.

Guard the route with `requirePermission("administrator", "inventory_manager")`. Validate the body with zod: `quantity` must be a positive integer, and both IDs must be UUIDs.

Add tests to `server/src/test/stock.test.ts` for three cases: an existing stock row, a new location (the insert path), and an invalid quantity.

### 4.4 Scanning input

| Option | How it works | Trade-offs |
|---|---|---|
| USB/Bluetooth scanner (recommended first) | The scanner acts like a keyboard. It types the code and presses Enter. | Needs only an `<input autoFocus>` and an `onKeyDown` handler that runs on Enter. No library. Codes can be typed by hand for testing. |
| Device camera | Use a library such as `@zxing/browser` or `html5-qrcode`. | Requires HTTPS (localhost is fine for development) and camera permission. The native `BarcodeDetector` API doesn't work in Safari or Firefox, so a library is needed. |

Build the keyboard version first. Camera scanning can be added later as another way to fill the same input.

### 4.5 Frontend API helpers

Add these next to the existing helpers in `src/lib/api.ts`:

```ts
export const findItemByBarcode = (code: string) =>
  apiFetch<CatalogItem>(`/catalog-items/by-barcode/${encodeURIComponent(code)}`);

export const receiveStock = (input: { catalogItemId: string; locationId: string; quantity: number; notes?: string }) =>
  apiFetch("/stock/receive", { method: "POST", body: JSON.stringify(input) });
```

`apiFetch` throws on any non-2xx response. The scan UI should catch the 404 from the lookup and open the "new item" form with the barcode filled in.

### 4.6 Keeping the app updated

After a successful stock-in, call `await refresh()` from `useData()`. The revision number goes up, and memoized selectors on pages such as `Inventory.tsx` recompute.

`refresh()` sets `loading = true`, so `DataState` may flash a loading screen after each scan. For scanning many items in a row, choose one of these:

- Add a silent refresh option that reloads data without changing the loading flag.
- Patch the client store directly with the `stockItem` and `transaction` returned by the endpoint, and skip the full reload.

## 5. Phase 2: Per-Unit Identifiers

### 5.1 Why a new table is needed

Every row already has a unique primary key, but the existing rows represent product types (`catalog_items`) or counts (`stock_items`). Ten docks in one storage room share a single `stock_items` row and ID. To give each physical unit its own ID, add a table where one row is one unit:

```ts
export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),          // internal ID; foreign keys point here
  assetTag: text("asset_tag").notNull().unique(),       // printed on the label and scanned, e.g. "IT-000042"
  serialNumber: text("serial_number").unique(),         // manufacturer serial, when available
  catalogItemId: uuid("catalog_item_id").notNull().references(() => catalogItems.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  status: text("status").notNull().default("in_stock"), // in_stock | checked_out | retired
  assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
});
```

This is close to the `assets` table in section 4.7 of `database-persistence-proposal.md`. If Phase 2 goes ahead, reconcile the two designs: use one status vocabulary, and decide whether `serial_number` is required.

### 5.2 Key design rule

Keep the UUID as the primary key, and store the scannable value (asset tag or serial number) in its own unique column. Don't use the barcode as the primary key. Labels get reprinted and serial numbers get mistyped, and changing a primary key would affect every foreign key that references it.

### 5.3 Hybrid tracking

Not every item is worth labeling. Split tracking by catalog item type:

- **`consumable`** items keep the quantity-based `stock_items` model and the Phase 1 product barcode.
- **`accessory`** items, and devices if they are added back to scope, are tracked per unit in `assets`. Their available count is the number of rows with `status = 'in_stock'`, not a value derived from the checkout ledger.

### 5.4 Behaviour changes

- **Scan a new unit:** insert an `assets` row.
- **Scan an existing tag:** look up the unit and show its details, with actions to check out, return, or move it.
- **Checkout/return:** update `status` and `assigned_user_id` on the asset, and still append an `inventory_transactions` row (`quantity = 1`) for history.
- **Audit link:** add back the nullable `related_asset_id` column on `inventory_transactions`. It appears in the persistence proposal, and migration `0002_inventory_only.sql` removed it.

## 6. Migrating Existing Data

Phase 1 needs no data migration. Phase 2 needs one asset row for each existing unit of every per-unit item.

### 6.1 Backfill migration

Create an empty migration with `npx drizzle-kit generate --custom`, then add:

```sql
CREATE SEQUENCE asset_tag_seq;

INSERT INTO assets (catalog_item_id, location_id, asset_tag, status)
SELECT s.catalog_item_id,
       s.location_id,
       'IT-' || lpad(nextval('asset_tag_seq')::text, 6, '0'),
       'in_stock'
FROM stock_items s
JOIN catalog_items c ON c.id = s.catalog_item_id
CROSS JOIN generate_series(1, s.quantity)     -- one row per unit
WHERE c.type = 'accessory';
```

`generate_series(1, s.quantity)` repeats each stock row once per unit. A row with quantity 10 becomes 10 asset rows, each with its own UUID and asset tag.

### 6.2 Follow-up steps

1. **Checked-out units.** The checkout ledger records counts, not specific units. For each item and location, set `status = 'checked_out'` on as many units as are currently checked out. `assigned_user_id` stays empty for these units and can be filled in as they are returned.
2. **Physical labels.** Generated tags exist only in the database until labels are printed and attached. Most label printers accept a CSV export of tags. Alternatively, skip pre-generating tags and record each unit's tag or serial number during a physical stock count. This also serves as an audit.
3. **Seed and import scripts.** Update `server/src/db/seed.ts` and `server/src/import/importWorkbook.ts` to create `assets` rows. Otherwise, a database reset or re-import brings back the old model. The importer currently skips rows that have an asset tag or serial number (`skippedSerializedRows`). It could import those rows instead, as `excel-import-proposal.md` originally described.
4. **Safety.** Take a `pg_dump` backup before running the backfill on real data, or test it on a copy first.

## 7. Scope Decision Required

The README states that individually tracked assets (laptops, desktops) are out of scope and are managed in a separate system. Phase 1 fits within the current scope. Phase 2 partly reverses that decision.

The application has already implemented and removed per-unit tracking once. Earlier commits contain an `assets` table (with `asset_tag` and `serial_number` columns), `server/src/routes/assets.ts`, `server/src/services/assets.ts`, and `server/src/test/assets.test.ts`. Migration `0002_inventory_only.sql` drops that table and the `inventory_transactions.related_asset_id` column. If Phase 2 goes ahead, start from that earlier code in git history instead of rewriting it, and add a new migration rather than editing `0002`.

Before starting Phase 2, confirm:

- Should per-unit tracking cover only `accessory` items, or also devices that are currently managed elsewhere?
- If another system already tracks those devices, would duplicating them here cause conflicting records?
- What has changed since the decision to remove asset tracking?

## 8. Implementation Order

**Phase 1**

1. Add the `barcode` column, migration, and validation.
2. Add the lookup endpoint.
3. Add the `receiveStock` service, route, and tests.
4. Build the scan page or modal with keyboard-input scanning.
5. Refresh the app after each scan (silently, if possible).
6. Optional: add camera scanning and an unknown-barcode flow that creates the item.

**Phase 2** (after the scope decision)

1. Add the `assets` table and the `inventory_transactions.related_asset_id` column.
2. Write the backfill migration and the follow-up updates for checked-out units.
3. Add asset-based checkout/return services and tests.
4. Extend the scan page to look up asset tags.
5. Update the Inventory page so per-unit item counts come from `assets`.
6. Update the seed and import scripts.
