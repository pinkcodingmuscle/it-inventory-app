# IT Inventory Application: Data Structure Proposal

## 1. Purpose

This proposal defines a data structure for supporting the IT inventory application. The goal is to replace page-local sample arrays with a consistent model that can support the current React interface and later connect to an API or relational database.

The model is designed around two different kinds of inventory:

- **Serialized assets:** individually tracked equipment such as laptops, desktops, monitors, and printers.
- **Bulk stock:** quantities of items such as cables, toner, batteries, mice, and cleaning supplies.

Keeping these concepts separate prevents asset assignments, stock counts, purchase orders, and lifecycle reports from duplicating or contradicting each other.

## 2. Current Application Context

The application currently includes pages for:

- Dashboard
- Inventory
- Assets
- Consumables
- Software
- Purchases
- Vendors
- Users
- Locations
- Reports
- Lifecycle
- Settings

The current pages use independent arrays of display-ready objects. For example, an asset stores an assignee and location as names, while an inventory item stores `qty` and `available` directly. This works for a visual prototype, but it makes updates difficult because the same user, location, vendor, or item can be represented differently on different pages.

## 3. Proposed Domain Model

### 3.1 Shared Identifiers and Enumerations

All records should use stable string identifiers instead of array indexes or display names.

```ts
type ID = string;

type CatalogItemType =
  | "asset"
  | "consumable"
  | "accessory"
  | "software";

type AssetStatus =
  | "active"
  | "in_storage"
  | "under_repair"
  | "retired";

type PurchaseOrderStatus = "open" | "received" | "cancelled";

type InventoryTransactionType =
  | "purchase"
  | "receipt"
  | "checkout"
  | "return"
  | "adjustment"
  | "disposal";
```

### 3.2 Catalog Items

`CatalogItem` represents the definition of an item or product model. It does not represent one physical device.

```ts
interface CatalogItem {
  id: ID;
  name: string;
  category: string;
  type: CatalogItemType;
  manufacturer?: string;
  model?: string;
  vendorId?: ID;
  reorderPoint?: number;
  lifecycleMonths?: number;
}
```

Examples include `Dell Latitude 5530`, `USB-C Cables`, `HP 58A Toner`, and `Adobe Creative Cloud`.

### 3.3 Serialized Assets

`Asset` represents one physical, serialized unit. Each asset can be assigned, moved, repaired, retired, and included in lifecycle reporting.

```ts
interface Asset {
  id: ID;
  catalogItemId: ID;
  assetTag: string;
  serialNumber: string;
  status: AssetStatus;
  purchaseOrderId?: ID;
  purchaseDate?: string;
  warrantyEndDate?: string;
  locationId: ID;
  assignedUserId?: ID;
  notes?: string;
}
```

The Assets page can display the catalog item name, user name, and location name by resolving their IDs. Names should not be stored directly in the asset record.

### 3.4 Bulk Stock

`StockItem` represents the quantity of a catalog item at a particular location.

```ts
interface StockItem {
  id: ID;
  catalogItemId: ID;
  locationId: ID;
  quantity: number;
  reorderPoint?: number;
}
```

This supports both the Inventory and Consumables pages. A consumable's status is derived from quantity and reorder point:

```ts
function getStockStatus(quantity: number, reorderPoint: number) {
  if (quantity === 0) return "out";
  if (quantity <= reorderPoint) return "low";
  return "ok";
}
```

The application should avoid storing both `quantity` and `available` as unrelated values. Availability should be calculated from stock transactions and active allocations where that distinction is needed.

### 3.5 Inventory Transactions

Transactions provide an auditable source for stock changes.

```ts
interface InventoryTransaction {
  id: ID;
  catalogItemId: ID;
  locationId: ID;
  type: InventoryTransactionType;
  quantity: number;
  performedByUserId: ID;
  relatedAssetId?: ID;
  relatedPurchaseOrderId?: ID;
  createdAt: string;
  notes?: string;
}
```

Transactions make it possible to explain why a quantity changed, generate reports, and recover from accidental adjustments.

### 3.6 Users, Departments, and Locations

```ts
interface User {
  id: ID;
  name: string;
  email: string;
  role: string;
  departmentId?: ID;
  status: "active" | "inactive";
}

interface Department {
  id: ID;
  name: string;
}

interface Location {
  id: ID;
  name: string;
  type: "office" | "storage" | "meeting_room" | "remote";
  managerUserId?: ID;
  notes?: string;
}
```

These entities support the Users, Locations, Assets, Inventory, Reports, and Dashboard pages. An asset should reference `assignedUserId` and `locationId`, rather than storing values such as `"John Smith"` or `"Main Office"`.

### 3.7 Vendors and Purchasing

```ts
interface Vendor {
  id: ID;
  name: string;
  category: "hardware" | "software" | "accessories" | "other";
  contactName?: string;
  email?: string;
  phone?: string;
}

interface PurchaseOrder {
  id: ID;
  purchaseOrderNumber: string;
  vendorId: ID;
  orderDate: string;
  status: PurchaseOrderStatus;
  total: number;
  notes?: string;
}

interface PurchaseOrderLine {
  id: ID;
  purchaseOrderId: ID;
  catalogItemId: ID;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
}
```

Purchase orders should use formal line items instead of storing display strings such as `"10 x Latitude 5530"`. When a purchase order is received, its line items can create stock quantities or serialized asset records.

### 3.8 Software Licenses

```ts
interface SoftwareLicense {
  id: ID;
  catalogItemId: ID;
  licenseType: "subscription" | "perpetual" | "volume";
  totalSeats: number;
  renewalDate?: string;
  vendorId?: ID;
}

interface SoftwareAssignment {
  id: ID;
  softwareLicenseId: ID;
  userId?: ID;
  assetId?: ID;
  assignedAt: string;
  revokedAt?: string;
}
```

Software seat usage can be calculated from active assignments. An assignment can belong to a user, a device, or both depending on the licensing model.

### 3.9 Asset Lifecycle History

```ts
interface AssetEvent {
  id: ID;
  assetId: ID;
  type:
    | "purchased"
    | "assigned"
    | "returned"
    | "moved"
    | "repair_started"
    | "repair_completed"
    | "retired";
  fromUserId?: ID;
  toUserId?: ID;
  fromLocationId?: ID;
  toLocationId?: ID;
  createdAt: string;
  notes?: string;
}
```

The Lifecycle page can calculate age and replacement dates from `purchaseDate` and the catalog item's `lifecycleMonths`. `AssetEvent` preserves the history needed for audits and reports.

## 4. Application State Shape

For the React prototype, entities should be stored in normalized collections. This avoids copying the same user, vendor, or location into multiple page arrays.

```ts
interface AppData {
  catalogItems: Record<ID, CatalogItem>;
  assets: Record<ID, Asset>;
  stockItems: Record<ID, StockItem>;
  inventoryTransactions: Record<ID, InventoryTransaction>;
  users: Record<ID, User>;
  departments: Record<ID, Department>;
  locations: Record<ID, Location>;
  vendors: Record<ID, Vendor>;
  purchaseOrders: Record<ID, PurchaseOrder>;
  purchaseOrderLines: Record<ID, PurchaseOrderLine>;
  softwareLicenses: Record<ID, SoftwareLicense>;
  softwareAssignments: Record<ID, SoftwareAssignment>;
  assetEvents: Record<ID, AssetEvent>;
}
```

Page filters and selection state should remain separate from domain data:

```ts
interface AssetViewState {
  search: string;
  status?: AssetStatus;
  selectedAssetId?: ID;
}

interface InventoryViewState {
  search: string;
  categoryId?: ID;
  locationId?: ID;
}
```

## 5. Relationships

```text
CatalogItem
├── Asset[]
├── StockItem[]
├── PurchaseOrderLine[]
└── SoftwareLicense[]

Asset
├── assignedUserId -> User
├── locationId -> Location
├── purchaseOrderId -> PurchaseOrder
└── AssetEvent[]

PurchaseOrder
├── vendorId -> Vendor
└── PurchaseOrderLine[]

SoftwareLicense
└── SoftwareAssignment[] -> User or Asset
```

## 6. Derived Values

The following values should be calculated rather than stored independently:

| Value | Calculation |
| --- | --- |
| Asset display name | `Asset.catalogItemId -> CatalogItem.name` |
| Assigned user name | `Asset.assignedUserId -> User.name` |
| Location name | `locationId -> Location.name` |
| Stock status | `quantity` compared with `reorderPoint` |
| Inventory in use | Total quantity minus available quantity or active allocations |
| Used software seats | Count of active `SoftwareAssignment` records |
| Lifecycle age | Current date minus `purchaseDate` |
| Replacement due date | `purchaseDate` plus `lifecycleMonths` |
| Vendor supplied count | Count of related assets, stock items, licenses, or purchase lines |
| Purchase order total | Sum of `quantity * unitPrice` for its line items |

Derived values stay accurate when assignments, receipts, or settings change.

## 7. Recommended File Organization

The first implementation can remain frontend-only while establishing boundaries for future persistence:

```text
src/
  types/
    domain.ts
  data/
    seedData.ts
  lib/
    inventory.ts
    lifecycle.ts
    selectors.ts
  pages/
    Assets.tsx
    Inventory.tsx
    Consumables.tsx
    Purchases.tsx
```

- `types/domain.ts` contains the shared interfaces and union types.
- `data/seedData.ts` contains the prototype records currently spread across page files.
- `lib/inventory.ts` contains stock calculations and transaction helpers.
- `lib/lifecycle.ts` contains end-of-life calculations.
- `lib/selectors.ts` resolves IDs into display-ready view models.
- Page components handle rendering and local filter state, not domain calculations.

## 8. Implementation Plan

### Phase 1: Establish the types

1. Add `src/types/domain.ts`.
2. Replace numeric IDs and display-name references with `ID` fields.
3. Define shared status unions.

### Phase 2: Centralize seed data

1. Create `src/data/seedData.ts`.
2. Move catalog items, users, locations, vendors, assets, stock, and purchases into the seed data.
3. Add stable IDs and foreign-key relationships.

### Phase 3: Add selectors and calculations

1. Resolve related names for table rows through selectors.
2. Calculate inventory availability and consumable status.
3. Calculate software seat usage and lifecycle dates.

### Phase 4: Add shared application state

1. Introduce a context, reducer, or state library only when multiple pages need to mutate the same data.
2. Route assignment, receiving, movement, repair, and retirement actions through shared state.
3. Record corresponding inventory transactions and asset events.

### Phase 5: Add persistence

1. Expose the same domain model through an API.
2. Map the normalized collections to database tables or API resources.
3. Add validation and authorization around mutations.

## 9. Acceptance Criteria

The data structure will be considered ready for the next implementation stage when:

- Every asset has a stable asset tag, serial number, catalog item, location, and status.
- Users and locations are referenced by IDs rather than duplicated names.
- Bulk inventory and serialized assets are represented separately.
- Purchase orders have structured line items.
- Inventory and software counts are derived from source records.
- Lifecycle dates can be recalculated when settings change.
- Asset movement, assignment, repair, and retirement can be represented as events.
- The Dashboard, Reports, and Lifecycle pages can read the same underlying data as the detail pages.

## 10. Conclusion

The recommended structure is a normalized, relationship-based model centered on `CatalogItem`, `Asset`, and `StockItem`. It supports the existing screens while leaving room for procurement, assignments, reporting, software licensing, audit history, and future API persistence.

The next practical change is to add the shared domain types and migrate the existing page-local arrays into seed data. This preserves the current UI while giving every page a consistent source of truth.