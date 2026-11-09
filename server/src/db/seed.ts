import "../env.js";
import { sql } from "drizzle-orm";
import { db, pool } from "./client.js";
import { seedId } from "./ids.js";
import {
  catalogItems,
  departments,
  inventoryTransactions,
  locations,
  purchaseOrderLines,
  purchaseOrders,
  stockItems,
  users,
  vendors,
} from "./schema.js";

const id = seedId;

async function main() {
  console.log("Seeding development data...");

  await db.execute(sql`
    TRUNCATE TABLE
      inventory_transactions, stock_items,
      purchase_order_lines, purchase_orders, catalog_items,
      vendors, locations, users, departments
    RESTART IDENTITY CASCADE
  `);

  await db.insert(departments).values([{ id: id("dept-it"), name: "IT" }]);

  // Users here are the IT staff operating the inventory system (they drive
  // permissions and the transaction audit trail), not end users being tracked.
  await db.insert(users).values([
    { id: id("usr-esther"), name: "Esther Mukuye", role: "IT Administrator", departmentId: id("dept-it"), email: "e.mukuye@kayaku.com", status: "active" },
    { id: id("usr-michael"), name: "Michael Brown", role: "Inventory Manager", departmentId: id("dept-it"), email: "m.brown@kayaku.com", status: "active" },
    { id: id("usr-robert"), name: "Robert Wilson", role: "Tech Support", departmentId: id("dept-it"), email: "r.wilson@kayaku.com", status: "active" },
  ]);

  await db.insert(locations).values([
    { id: id("loc-storage"), name: "IT Storage Room", type: "storage", managerUserId: id("usr-esther"), notes: "Primary storage, B1 level" },
    { id: id("loc-helpdesk"), name: "Help Desk", type: "office", managerUserId: id("usr-robert"), notes: "Front-line support station" },
    { id: id("loc-main"), name: "Main Office", type: "office", managerUserId: id("usr-michael"), notes: "Open-plan floor, desks 1-40" },
    { id: id("loc-confa"), name: "Conference Room A", type: "meeting_room", notes: "AV supplies cabinet" },
    { id: id("loc-warehouse"), name: "Off-site Warehouse", type: "storage", notes: "Overflow storage, requires access request" },
  ]);

  await db.insert(vendors).values([
    { id: id("ven-dell"), name: "Dell Technologies", category: "hardware", contactName: "Mike Rogers", email: "mrogers@dell.com", phone: "(512) 338-4400" },
    { id: id("ven-hp"), name: "HP Inc.", category: "hardware", contactName: "Amy Chen", email: "achen@hp.com", phone: "(650) 857-1501" },
    { id: id("ven-cablematters"), name: "Cable Matters", category: "accessories", contactName: "Orders Team", email: "orders@cablematters.com", phone: "(503) 217-3800" },
  ]);

  await db.insert(catalogItems).values([
    { id: id("ci-dockingstation"), name: "USB-C Docking Station", category: "Accessories", type: "accessory", vendorId: id("ven-dell"), reorderPoint: 4, unitPrice: "140" },
    { id: id("ci-powerAdapters"), name: "Laptop Power Adapters", category: "Accessories", type: "accessory", vendorId: id("ven-dell"), reorderPoint: 2, unitPrice: "60" },
    { id: id("ci-keyboards"), name: "Wired Keyboards", category: "Peripherals", type: "accessory", vendorId: id("ven-dell"), reorderPoint: 3, unitPrice: "20" },

    { id: id("ci-usbccables"), name: "USB-C Cables", category: "Cables", type: "consumable", vendorId: id("ven-cablematters"), reorderPoint: 5, unitPrice: "9" },
    { id: id("ci-hdmicables"), name: "HDMI Cables", category: "Cables", type: "consumable", vendorId: id("ven-cablematters"), reorderPoint: 5, unitPrice: "7" },
    { id: id("ci-usbabcables"), name: "USB-A to USB-B Cables", category: "Cables", type: "consumable", vendorId: id("ven-cablematters"), reorderPoint: 3, unitPrice: "6" },
    { id: id("ci-toner58a"), name: "HP 58A Toner", category: "Toner", type: "consumable", vendorId: id("ven-hp"), reorderPoint: 2, unitPrice: "140" },
    { id: id("ci-wirelessmice"), name: "Wireless Mice", category: "Peripherals", type: "consumable", vendorId: id("ven-dell"), reorderPoint: 3, unitPrice: "25" },
    { id: id("ci-aabatteries"), name: "AA Batteries", category: "Batteries", type: "consumable", reorderPoint: 10, unitPrice: "8" },
    { id: id("ci-cleaningwipes"), name: "Cleaning Wipes", category: "Accessories", type: "consumable", reorderPoint: 10, unitPrice: "4" },
  ]);

  await db.insert(purchaseOrders).values([
    { id: id("po-083"), purchaseOrderNumber: "PO-2024-083", vendorId: id("ven-cablematters"), orderDate: "2024-08-18", status: "open" },
    { id: id("po-082"), purchaseOrderNumber: "PO-2024-082", vendorId: id("ven-hp"), orderDate: "2024-08-15", status: "open" },
    { id: id("po-081"), purchaseOrderNumber: "PO-2024-081", vendorId: id("ven-dell"), orderDate: "2024-08-10", status: "received" },
    { id: id("po-079"), purchaseOrderNumber: "PO-2024-079", vendorId: id("ven-cablematters"), orderDate: "2024-07-28", status: "received" },
    { id: id("po-070"), purchaseOrderNumber: "PO-2024-070", vendorId: id("ven-dell"), orderDate: "2024-06-20", status: "cancelled" },
  ]);

  await db.insert(purchaseOrderLines).values([
    { id: id("pol-083-1"), purchaseOrderId: id("po-083"), catalogItemId: id("ci-usbccables"), quantity: 20, unitPrice: "9", receivedQuantity: 0 },
    { id: id("pol-082-1"), purchaseOrderId: id("po-082"), catalogItemId: id("ci-toner58a"), quantity: 3, unitPrice: "140", receivedQuantity: 0 },
    { id: id("pol-081-1"), purchaseOrderId: id("po-081"), catalogItemId: id("ci-dockingstation"), quantity: 10, unitPrice: "140", receivedQuantity: 10 },
    { id: id("pol-079-1"), purchaseOrderId: id("po-079"), catalogItemId: id("ci-hdmicables"), quantity: 30, unitPrice: "7", receivedQuantity: 30 },
    { id: id("pol-070-1"), purchaseOrderId: id("po-070"), catalogItemId: id("ci-wirelessmice"), quantity: 10, unitPrice: "25", receivedQuantity: 0 },
  ]);

  const stockItemSeeds: { slug: string; catalogItem: string; location: string; quantity: number; reorderPoint?: number }[] = [
    { slug: "stk-dockingstation", catalogItem: "ci-dockingstation", location: "loc-storage", quantity: 18, reorderPoint: 4 },
    { slug: "stk-powerAdapters", catalogItem: "ci-powerAdapters", location: "loc-storage", quantity: 0, reorderPoint: 2 },
    { slug: "stk-keyboards", catalogItem: "ci-keyboards", location: "loc-storage", quantity: 9, reorderPoint: 3 },
    { slug: "stk-usbccables", catalogItem: "ci-usbccables", location: "loc-storage", quantity: 2, reorderPoint: 5 },
    { slug: "stk-hdmicables", catalogItem: "ci-hdmicables", location: "loc-storage", quantity: 8, reorderPoint: 5 },
    { slug: "stk-usbabcables", catalogItem: "ci-usbabcables", location: "loc-storage", quantity: 5, reorderPoint: 3 },
    { slug: "stk-toner58a", catalogItem: "ci-toner58a", location: "loc-storage", quantity: 0, reorderPoint: 2 },
    { slug: "stk-wirelessmice", catalogItem: "ci-wirelessmice", location: "loc-storage", quantity: 3, reorderPoint: 3 },
    { slug: "stk-aabatteries", catalogItem: "ci-aabatteries", location: "loc-helpdesk", quantity: 24, reorderPoint: 10 },
    { slug: "stk-cleaningwipes", catalogItem: "ci-cleaningwipes", location: "loc-helpdesk", quantity: 40, reorderPoint: 10 },
  ];

  await db.insert(stockItems).values(
    stockItemSeeds.map((s) => ({
      id: id(s.slug),
      catalogItemId: id(s.catalogItem),
      locationId: id(s.location),
      quantity: s.quantity,
      reorderPoint: s.reorderPoint,
    }))
  );

  // checkoutQty = quantity currently allocated out of a stock item (quantity - available)
  const checkoutQtyBySlug: Record<string, number> = {
    "stk-dockingstation": 11,
    "stk-keyboards": 4,
  };

  const transactionRows = stockItemSeeds.flatMap((s) => {
    const rows: (typeof inventoryTransactions.$inferInsert)[] = [
      {
        id: id(`txn-${s.slug}-receipt`),
        catalogItemId: id(s.catalogItem),
        locationId: id(s.location),
        type: "receipt" as const,
        quantity: s.quantity || 1,
        performedByUserId: id("usr-esther"),
        createdAt: new Date("2024-01-15T00:00:00Z"),
        notes: "Initial stock receipt",
      },
    ];
    const checkoutQty = checkoutQtyBySlug[s.slug];
    if (checkoutQty) {
      rows.push({
        id: id(`txn-${s.slug}-checkout`),
        catalogItemId: id(s.catalogItem),
        locationId: id(s.location),
        type: "checkout" as const,
        quantity: checkoutQty,
        performedByUserId: id("usr-esther"),
        createdAt: new Date("2024-02-01T00:00:00Z"),
        notes: "Allocated to departments",
      });
    }
    return rows;
  });

  await db.insert(inventoryTransactions).values(transactionRows);

  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
