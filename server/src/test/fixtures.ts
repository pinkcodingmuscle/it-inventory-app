import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { createSession } from "../services/sessions.js";
import {
  catalogItems,
  departments,
  locations,
  purchaseOrderLines,
  purchaseOrders,
  stockItems,
  users,
  vendors,
} from "../db/schema.js";

/** Truncates every domain table and inserts a small, consistent fixture set for one test. */
export async function resetAndSeed() {
  await db.execute(sql`
    TRUNCATE TABLE
      sessions, app_settings,
      inventory_transactions, stock_items,
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
  const [consumableCatalogItem] = await db
    .insert(catalogItems)
    .values({ name: "Test Cable", category: "Cables", type: "consumable", vendorId: vendor.id, reorderPoint: 5, unitPrice: "5" })
    .returning();
  const [stockItem] = await db
    .insert(stockItems)
    .values({ catalogItemId: consumableCatalogItem.id, locationId: location.id, quantity: 10 })
    .returning();
  const [po] = await db
    .insert(purchaseOrders)
    .values({ purchaseOrderNumber: "PO-TEST-1", vendorId: vendor.id, orderDate: "2024-01-01", status: "open" })
    .returning();
  const [poLine] = await db
    .insert(purchaseOrderLines)
    .values({ purchaseOrderId: po.id, catalogItemId: consumableCatalogItem.id, quantity: 20, unitPrice: "5" })
    .returning();

  // Authorization headers for each fixture user, from real sessions.
  const header = async (userId: string) => ({ Authorization: `Bearer ${(await createSession(userId)).token}` });
  const auth = { admin: await header(admin.id), tech: await header(tech.id), readOnly: await header(readOnly.id) };

  return {
    auth,
    dept,
    admin,
    tech,
    readOnly,
    location,
    vendor,
    consumableCatalogItem,
    stockItem,
    po,
    poLine,
  };
}

export type Fixtures = Awaited<ReturnType<typeof resetAndSeed>>;
