import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    role: text("role").notNull(),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [check("users_status_check", sql`${table.status} IN ('active', 'inactive')`)]
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    type: text("type").notNull(),
    managerUserId: uuid("manager_user_id").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    check("locations_type_check", sql`${table.type} IN ('office', 'storage', 'meeting_room', 'remote')`),
  ]
);

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    category: text("category").notNull(),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    ...timestamps,
  },
  (table) => [
    check(
      "vendors_category_check",
      sql`${table.category} IN ('hardware', 'software', 'accessories', 'other')`
    ),
  ]
);

export const catalogItems = pgTable(
  "catalog_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    type: text("type").notNull(),
    manufacturer: text("manufacturer"),
    model: text("model"),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
    reorderPoint: integer("reorder_point"),
    lifecycleMonths: integer("lifecycle_months"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    ...timestamps,
  },
  (table) => [
    check(
      "catalog_items_type_check",
      sql`${table.type} IN ('asset', 'consumable', 'accessory', 'software')`
    ),
    check("catalog_items_reorder_point_check", sql`${table.reorderPoint} >= 0`),
    check("catalog_items_lifecycle_months_check", sql`${table.lifecycleMonths} > 0`),
  ]
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseOrderNumber: text("purchase_order_number").notNull().unique(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    orderDate: date("order_date").notNull(),
    status: text("status").notNull().default("open"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    check("purchase_orders_status_check", sql`${table.status} IN ('open', 'received', 'cancelled')`),
  ]
);

export const purchaseOrderLines = pgTable(
  "purchase_order_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    catalogItemId: uuid("catalog_item_id")
      .notNull()
      .references(() => catalogItems.id),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    receivedQuantity: integer("received_quantity").notNull().default(0),
  },
  (table) => [
    check("purchase_order_lines_quantity_check", sql`${table.quantity} > 0`),
    check("purchase_order_lines_unit_price_check", sql`${table.unitPrice} >= 0`),
    check(
      "purchase_order_lines_received_quantity_check",
      sql`${table.receivedQuantity} >= 0 AND ${table.receivedQuantity} <= ${table.quantity}`
    ),
  ]
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    catalogItemId: uuid("catalog_item_id")
      .notNull()
      .references(() => catalogItems.id),
    assetTag: text("asset_tag").notNull().unique(),
    serialNumber: text("serial_number").notNull().unique(),
    status: text("status").notNull(),
    purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
    purchaseDate: date("purchase_date"),
    warrantyEndDate: date("warranty_end_date"),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    check(
      "assets_status_check",
      sql`${table.status} IN ('active', 'in_storage', 'under_repair', 'retired')`
    ),
    index("assets_catalog_item_id_idx").on(table.catalogItemId),
    index("assets_location_id_idx").on(table.locationId),
    index("assets_assigned_user_id_idx").on(table.assignedUserId),
    index("assets_status_idx").on(table.status),
  ]
);

export const stockItems = pgTable(
  "stock_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    catalogItemId: uuid("catalog_item_id")
      .notNull()
      .references(() => catalogItems.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    quantity: integer("quantity").notNull().default(0),
    reorderPoint: integer("reorder_point"),
    ...timestamps,
  },
  (table) => [
    check("stock_items_quantity_check", sql`${table.quantity} >= 0`),
    check("stock_items_reorder_point_check", sql`${table.reorderPoint} >= 0`),
    unique("stock_items_catalog_item_location_unique").on(table.catalogItemId, table.locationId),
    index("stock_items_location_id_idx").on(table.locationId),
  ]
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    catalogItemId: uuid("catalog_item_id")
      .notNull()
      .references(() => catalogItems.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    type: text("type").notNull(),
    quantity: integer("quantity").notNull(),
    performedByUserId: uuid("performed_by_user_id")
      .notNull()
      .references(() => users.id),
    relatedAssetId: uuid("related_asset_id").references(() => assets.id, { onDelete: "set null" }),
    relatedPurchaseOrderId: uuid("related_purchase_order_id").references(() => purchaseOrders.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
  },
  (table) => [
    check(
      "inventory_transactions_type_check",
      sql`${table.type} IN ('purchase', 'receipt', 'checkout', 'return', 'adjustment', 'disposal')`
    ),
    check("inventory_transactions_quantity_check", sql`${table.quantity} > 0`),
    index("inventory_transactions_catalog_location_idx").on(table.catalogItemId, table.locationId),
    index("inventory_transactions_created_at_idx").on(table.createdAt),
  ]
);

export const softwareLicenses = pgTable(
  "software_licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    catalogItemId: uuid("catalog_item_id")
      .notNull()
      .references(() => catalogItems.id),
    licenseType: text("license_type").notNull(),
    totalSeats: integer("total_seats").notNull(),
    renewalDate: date("renewal_date"),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    check(
      "software_licenses_license_type_check",
      sql`${table.licenseType} IN ('subscription', 'perpetual', 'volume')`
    ),
    check("software_licenses_total_seats_check", sql`${table.totalSeats} >= 0`),
  ]
);

export const softwareAssignments = pgTable(
  "software_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    softwareLicenseId: uuid("software_license_id")
      .notNull()
      .references(() => softwareLicenses.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "software_assignments_user_or_asset_check",
      sql`${table.userId} IS NOT NULL OR ${table.assetId} IS NOT NULL`
    ),
    index("software_assignments_active_idx")
      .on(table.softwareLicenseId)
      .where(sql`${table.revokedAt} IS NULL`),
  ]
);

export const assetEvents = pgTable(
  "asset_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    fromUserId: uuid("from_user_id").references(() => users.id, { onDelete: "set null" }),
    toUserId: uuid("to_user_id").references(() => users.id, { onDelete: "set null" }),
    fromLocationId: uuid("from_location_id").references(() => locations.id, { onDelete: "set null" }),
    toLocationId: uuid("to_location_id").references(() => locations.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
  },
  (table) => [
    check(
      "asset_events_type_check",
      sql`${table.type} IN ('purchased', 'assigned', 'returned', 'moved', 'repair_started', 'repair_completed', 'retired')`
    ),
    index("asset_events_asset_id_created_at_idx").on(table.assetId, table.createdAt),
  ]
);
