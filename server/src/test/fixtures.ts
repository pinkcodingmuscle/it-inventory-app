import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  assets,
  catalogItems,
  departments,
  locations,
  purchaseOrderLines,
  purchaseOrders,
  softwareLicenses,
  stockItems,
  users,
  vendors,
} from "../db/schema.js";

/** Truncates every domain table and inserts a small, consistent fixture set for one test. */
export async function resetAndSeed() {
  await db.execute(sql`
    TRUNCATE TABLE
      asset_events, software_assignments, software_licenses,
      inventory_transactions, stock_items, assets,
      purchase_order_lines, purchase_orders, catalog_items,
      vendors, locations, users, departments
    RESTART IDENTITY CASCADE
  `);

  const [dept] = await db.insert(departments).values({ name: "IT" }).returning();
  const [admin] = await db
    .insert(users)
    .values({ name: "Admin User", email: "admin@test.local", role: "IT Administrator", departmentId: dept.id })
    .returning();
  const [tech] = await db
    .insert(users)
    .values({ name: "Tech User", email: "tech@test.local", role: "Tech Support", departmentId: dept.id })
    .returning();
  const [readOnly] = await db
    .insert(users)
    .values({ name: "Read Only User", email: "readonly@test.local", role: "Intern", departmentId: dept.id })
    .returning();
  const [location] = await db.insert(locations).values({ name: "Test Storage", type: "storage" }).returning();
  const [vendor] = await db.insert(vendors).values({ name: "Test Vendor", category: "hardware" }).returning();
  const [assetCatalogItem] = await db
    .insert(catalogItems)
    .values({ name: "Test Laptop", category: "Laptops", type: "asset", vendorId: vendor.id, lifecycleMonths: 36, unitPrice: "1000" })
    .returning();
  const [consumableCatalogItem] = await db
    .insert(catalogItems)
    .values({ name: "Test Cable", category: "Cables", type: "consumable", vendorId: vendor.id, reorderPoint: 5, unitPrice: "5" })
    .returning();
  const [stockItem] = await db
    .insert(stockItems)
    .values({ catalogItemId: consumableCatalogItem.id, locationId: location.id, quantity: 10 })
    .returning();
  const [asset] = await db
    .insert(assets)
    .values({ catalogItemId: assetCatalogItem.id, assetTag: "TEST-001", serialNumber: "SN-001", status: "active", locationId: location.id })
    .returning();
  const [po] = await db
    .insert(purchaseOrders)
    .values({ purchaseOrderNumber: "PO-TEST-1", vendorId: vendor.id, orderDate: "2024-01-01", status: "open" })
    .returning();
  const [poLine] = await db
    .insert(purchaseOrderLines)
    .values({ purchaseOrderId: po.id, catalogItemId: consumableCatalogItem.id, quantity: 20, unitPrice: "5" })
    .returning();
  const [license] = await db
    .insert(softwareLicenses)
    .values({ catalogItemId: assetCatalogItem.id, licenseType: "subscription", totalSeats: 1 })
    .returning();

  return {
    dept,
    admin,
    tech,
    readOnly,
    location,
    vendor,
    assetCatalogItem,
    consumableCatalogItem,
    stockItem,
    asset,
    po,
    poLine,
    license,
  };
}

export type Fixtures = Awaited<ReturnType<typeof resetAndSeed>>;
