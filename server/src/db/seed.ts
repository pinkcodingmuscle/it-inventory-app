import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "./client.js";
import { seedId } from "./ids.js";
import {
  assetEvents,
  assets,
  catalogItems,
  departments,
  inventoryTransactions,
  locations,
  purchaseOrderLines,
  purchaseOrders,
  softwareAssignments,
  softwareLicenses,
  stockItems,
  users,
  vendors,
} from "./schema.js";

const id = seedId;

async function main() {
  console.log("Seeding development data...");

  await db.execute(sql`
    TRUNCATE TABLE
      asset_events, software_assignments, software_licenses,
      inventory_transactions, stock_items, assets,
      purchase_order_lines, purchase_orders, catalog_items,
      vendors, locations, users, departments
    RESTART IDENTITY CASCADE
  `);

  await db.insert(departments).values([
    { id: id("dept-it"), name: "IT" },
    { id: id("dept-ops"), name: "Operations" },
    { id: id("dept-finance"), name: "Finance" },
    { id: id("dept-hr"), name: "HR" },
    { id: id("dept-admin"), name: "Admin" },
    { id: id("dept-marketing"), name: "Marketing" },
  ]);

  await db.insert(users).values([
    { id: id("usr-esther"), name: "Esther Mukuye", role: "IT Administrator", departmentId: id("dept-it"), email: "e.mukuye@kayaku.com", status: "active" },
    { id: id("usr-john"), name: "John Smith", role: "Engineer", departmentId: id("dept-ops"), email: "j.smith@kayaku.com", status: "active" },
    { id: id("usr-sarah"), name: "Sarah Lee", role: "Analyst", departmentId: id("dept-finance"), email: "s.lee@kayaku.com", status: "active" },
    { id: id("usr-michael"), name: "Michael Brown", role: "Manager", departmentId: id("dept-hr"), email: "m.brown@kayaku.com", status: "active" },
    { id: id("usr-jennifer"), name: "Jennifer Davis", role: "Receptionist", departmentId: id("dept-admin"), email: "j.davis@kayaku.com", status: "active" },
    { id: id("usr-robert"), name: "Robert Wilson", role: "Tech Support", departmentId: id("dept-it"), email: "r.wilson@kayaku.com", status: "active" },
    { id: id("usr-linda"), name: "Linda Martinez", role: "Intern", departmentId: id("dept-marketing"), email: "l.martinez@kayaku.com", status: "inactive" },
  ]);

  await db.insert(locations).values([
    { id: id("loc-storage"), name: "IT Storage Room", type: "storage", managerUserId: id("usr-esther"), notes: "Primary hardware storage, B1 level" },
    { id: id("loc-helpdesk"), name: "Help Desk", type: "office", managerUserId: id("usr-esther"), notes: "Front-line support station" },
    { id: id("loc-main"), name: "Main Office", type: "office", managerUserId: id("usr-michael"), notes: "Open-plan floor, desks 1-40" },
    { id: id("loc-confa"), name: "Conference Room A", type: "meeting_room", notes: "AV equipment, projector, video bar" },
    { id: id("loc-confb"), name: "Conference Room B", type: "meeting_room", notes: "Smaller meeting room, floor 2" },
    { id: id("loc-employee"), name: "Assigned to Employee", type: "remote", managerUserId: id("usr-esther"), notes: "Assets checked out to individual users" },
    { id: id("loc-warehouse"), name: "Off-site Warehouse", type: "storage", notes: "Overflow storage, requires access request" },
  ]);

  await db.insert(vendors).values([
    { id: id("ven-dell"), name: "Dell Technologies", category: "hardware", contactName: "Mike Rogers", email: "mrogers@dell.com", phone: "(512) 338-4400" },
    { id: id("ven-hp"), name: "HP Inc.", category: "hardware", contactName: "Amy Chen", email: "achen@hp.com", phone: "(650) 857-1501" },
    { id: id("ven-apple"), name: "Apple", category: "hardware", contactName: "Sales Desk", email: "sales@apple.com", phone: "(408) 996-1010" },
    { id: id("ven-microsoft"), name: "Microsoft", category: "software", contactName: "Tom Haley", email: "thaley@microsoft.com", phone: "(425) 882-8080" },
    { id: id("ven-adobe"), name: "Adobe Systems", category: "software", contactName: "Laura Kim", email: "lkim@adobe.com", phone: "(408) 536-6000" },
    { id: id("ven-lenovo"), name: "Lenovo", category: "hardware", contactName: "Sales Team", email: "sales@lenovo.com", phone: "(919) 257-6700" },
    { id: id("ven-cablematters"), name: "Cable Matters", category: "accessories", contactName: "Orders Team", email: "orders@cablematters.com", phone: "(503) 217-3800" },
    { id: id("ven-zoom"), name: "Zoom", category: "software", contactName: "Sales Desk", email: "sales@zoom.us", phone: "(888) 799-9666" },
    { id: id("ven-salesforce"), name: "Salesforce", category: "software", contactName: "Sales Desk", email: "sales@salesforce.com", phone: "(800) 667-6389" },
    { id: id("ven-autodesk"), name: "Autodesk", category: "software", contactName: "Sales Desk", email: "sales@autodesk.com", phone: "(415) 507-5000" },
    { id: id("ven-nortonlifelock"), name: "NortonLifeLock", category: "software", contactName: "Sales Desk", email: "sales@nortonlifelock.com", phone: "(800) 745-6844" },
  ]);

  await db.insert(catalogItems).values([
    { id: id("ci-latitude5530"), name: "Dell Latitude 5530", category: "Laptops", type: "asset", manufacturer: "Dell", model: "Latitude 5530", vendorId: id("ven-dell"), lifecycleMonths: 36, unitPrice: "1850" },
    { id: id("ci-elitebook840"), name: "HP EliteBook 840 G8", category: "Laptops", type: "asset", manufacturer: "HP", model: "EliteBook 840 G8", vendorId: id("ven-hp"), lifecycleMonths: 36, unitPrice: "1600" },
    { id: id("ci-macbookpro14"), name: 'MacBook Pro 14"', category: "Laptops", type: "asset", manufacturer: "Apple", model: 'MacBook Pro 14"', vendorId: id("ven-apple"), lifecycleMonths: 36, unitPrice: "2999" },
    { id: id("ci-latitude5420"), name: "Dell Latitude 5420", category: "Laptops", type: "asset", manufacturer: "Dell", model: "Latitude 5420", vendorId: id("ven-dell"), lifecycleMonths: 36, unitPrice: "1400" },
    { id: id("ci-probook450"), name: "HP ProBook 450 G8", category: "Laptops", type: "asset", manufacturer: "HP", model: "ProBook 450 G8", vendorId: id("ven-hp"), lifecycleMonths: 36, unitPrice: "1200" },
    { id: id("ci-thinkpadt490"), name: "Lenovo ThinkPad T490", category: "Laptops", type: "asset", manufacturer: "Lenovo", model: "ThinkPad T490", vendorId: id("ven-lenovo"), lifecycleMonths: 36, unitPrice: "1300" },
    { id: id("ci-optiplex7080"), name: "Dell OptiPlex 7080", category: "Desktops", type: "asset", manufacturer: "Dell", model: "OptiPlex 7080", vendorId: id("ven-dell"), lifecycleMonths: 48, unitPrice: "1100" },
    { id: id("ci-thinkcentrem70q"), name: "Lenovo ThinkCentre M70q", category: "Desktops", type: "asset", manufacturer: "Lenovo", model: "ThinkCentre M70q", vendorId: id("ven-lenovo"), lifecycleMonths: 48, unitPrice: "950" },
    { id: id("ci-laserjetm404n"), name: "HP LaserJet M404n", category: "Printers", type: "asset", manufacturer: "HP", model: "LaserJet M404n", vendorId: id("ven-hp"), lifecycleMonths: 60, unitPrice: "320" },
    { id: id("ci-monitor27"), name: 'Dell 27" Monitor', category: "Monitors", type: "asset", manufacturer: "Dell", vendorId: id("ven-dell"), lifecycleMonths: 60, unitPrice: "280" },

    { id: id("ci-dockingstation"), name: "USB-C Docking Station", category: "Accessories", type: "accessory", vendorId: id("ven-dell"), reorderPoint: 4, unitPrice: "140" },
    { id: id("ci-powerAdapters"), name: "Laptop Power Adapters", category: "Accessories", type: "accessory", vendorId: id("ven-dell"), reorderPoint: 2, unitPrice: "60" },

    { id: id("ci-usbccables"), name: "USB-C Cables", category: "Cables", type: "consumable", vendorId: id("ven-cablematters"), reorderPoint: 5, unitPrice: "9" },
    { id: id("ci-hdmicables"), name: "HDMI Cables", category: "Cables", type: "consumable", vendorId: id("ven-cablematters"), reorderPoint: 5, unitPrice: "7" },
    { id: id("ci-usbabcables"), name: "USB-A to USB-B Cables", category: "Cables", type: "consumable", vendorId: id("ven-cablematters"), reorderPoint: 3, unitPrice: "6" },
    { id: id("ci-toner58a"), name: "HP 58A Toner", category: "Toner", type: "consumable", vendorId: id("ven-hp"), reorderPoint: 2, unitPrice: "140" },
    { id: id("ci-wirelessmice"), name: "Wireless Mice", category: "Peripherals", type: "consumable", vendorId: id("ven-dell"), reorderPoint: 3, unitPrice: "25" },
    { id: id("ci-aabatteries"), name: "AA Batteries", category: "Batteries", type: "consumable", reorderPoint: 10, unitPrice: "8" },
    { id: id("ci-cleaningwipes"), name: "Cleaning Wipes", category: "Accessories", type: "consumable", reorderPoint: 10, unitPrice: "4" },

    { id: id("ci-microsoft365"), name: "Microsoft 365", category: "Software", type: "software", vendorId: id("ven-microsoft") },
    { id: id("ci-adobecc"), name: "Adobe Creative Cloud", category: "Software", type: "software", vendorId: id("ven-adobe"), unitPrice: "599.96" },
    { id: id("ci-zoom"), name: "Zoom", category: "Software", type: "software", vendorId: id("ven-zoom") },
    { id: id("ci-slack"), name: "Slack", category: "Software", type: "software", vendorId: id("ven-salesforce") },
    { id: id("ci-autocad2024"), name: "AutoCAD 2024", category: "Software", type: "software", vendorId: id("ven-autodesk") },
    { id: id("ci-windows11pro"), name: "Windows 11 Pro", category: "Software", type: "software", vendorId: id("ven-microsoft") },
    { id: id("ci-nortonav"), name: "Norton Antivirus", category: "Software", type: "software", vendorId: id("ven-nortonlifelock") },
  ]);

  await db.insert(purchaseOrders).values([
    { id: id("po-083"), purchaseOrderNumber: "PO-2024-083", vendorId: id("ven-cablematters"), orderDate: "2024-08-18", status: "open" },
    { id: id("po-082"), purchaseOrderNumber: "PO-2024-082", vendorId: id("ven-hp"), orderDate: "2024-08-15", status: "open" },
    { id: id("po-081"), purchaseOrderNumber: "PO-2024-081", vendorId: id("ven-dell"), orderDate: "2024-08-10", status: "received" },
    { id: id("po-079"), purchaseOrderNumber: "PO-2024-079", vendorId: id("ven-apple"), orderDate: "2024-07-28", status: "received" },
    { id: id("po-075"), purchaseOrderNumber: "PO-2024-075", vendorId: id("ven-adobe"), orderDate: "2024-07-05", status: "received" },
    { id: id("po-070"), purchaseOrderNumber: "PO-2024-070", vendorId: id("ven-lenovo"), orderDate: "2024-06-20", status: "cancelled" },
  ]);

  await db.insert(purchaseOrderLines).values([
    { id: id("pol-083-1"), purchaseOrderId: id("po-083"), catalogItemId: id("ci-usbccables"), quantity: 20, unitPrice: "9", receivedQuantity: 0 },
    { id: id("pol-082-1"), purchaseOrderId: id("po-082"), catalogItemId: id("ci-toner58a"), quantity: 3, unitPrice: "140", receivedQuantity: 0 },
    { id: id("pol-081-1"), purchaseOrderId: id("po-081"), catalogItemId: id("ci-latitude5530"), quantity: 10, unitPrice: "1850", receivedQuantity: 10 },
    { id: id("pol-079-1"), purchaseOrderId: id("po-079"), catalogItemId: id("ci-macbookpro14"), quantity: 2, unitPrice: "2999", receivedQuantity: 2 },
    { id: id("pol-075-1"), purchaseOrderId: id("po-075"), catalogItemId: id("ci-adobecc"), quantity: 25, unitPrice: "599.96", receivedQuantity: 25 },
    { id: id("pol-070-1"), purchaseOrderId: id("po-070"), catalogItemId: id("ci-thinkcentrem70q"), quantity: 5, unitPrice: "1450", receivedQuantity: 0 },
  ]);

  await db.insert(assets).values([
    { id: id("ast-1"), catalogItemId: id("ci-latitude5530"), assetTag: "LAP-001", serialNumber: "DL55-001", status: "active", purchaseOrderId: id("po-081"), purchaseDate: "2021-03-01", locationId: id("loc-main"), assignedUserId: id("usr-john") },
    { id: id("ast-2"), catalogItemId: id("ci-elitebook840"), assetTag: "LAP-002", serialNumber: "HP84-002", status: "active", purchaseDate: "2021-06-15", locationId: id("loc-main"), assignedUserId: id("usr-sarah") },
    { id: id("ast-3"), catalogItemId: id("ci-macbookpro14"), assetTag: "LAP-003", serialNumber: "MB14-003", status: "active", purchaseOrderId: id("po-079"), purchaseDate: "2023-10-01", locationId: id("loc-helpdesk"), assignedUserId: id("usr-esther") },
    { id: id("ast-4"), catalogItemId: id("ci-optiplex7080"), assetTag: "DKT-004", serialNumber: "OP70-004", status: "active", purchaseDate: "2022-10-25", locationId: id("loc-main"), assignedUserId: id("usr-jennifer") },
    { id: id("ast-5"), catalogItemId: id("ci-thinkcentrem70q"), assetTag: "DKT-005", serialNumber: "TC70-005", status: "active", purchaseDate: "2025-01-15", locationId: id("loc-main"), assignedUserId: id("usr-michael") },
    { id: id("ast-6"), catalogItemId: id("ci-laserjetm404n"), assetTag: "PRN-006", serialNumber: "LJ40-006", status: "in_storage", purchaseDate: "2024-11-01", locationId: id("loc-storage") },
    { id: id("ast-7"), catalogItemId: id("ci-latitude5420"), assetTag: "LAP-007", serialNumber: "DL54-007", status: "in_storage", purchaseDate: "2024-03-01", locationId: id("loc-storage") },
    { id: id("ast-8"), catalogItemId: id("ci-probook450"), assetTag: "LAP-008", serialNumber: "PB45-008", status: "retired", purchaseDate: "2020-01-01", locationId: id("loc-warehouse") },
    { id: id("ast-9"), catalogItemId: id("ci-thinkpadt490"), assetTag: "LAP-009", serialNumber: "TP49-009", status: "under_repair", purchaseDate: "2023-11-20", locationId: id("loc-helpdesk"), assignedUserId: id("usr-robert") },
    { id: id("ast-10"), catalogItemId: id("ci-monitor27"), assetTag: "MON-010", serialNumber: "DM27-010", status: "active", purchaseDate: "2022-01-15", locationId: id("loc-main"), assignedUserId: id("usr-john") },
  ]);

  const stockItemSeeds: { slug: string; catalogItem: string; location: string; quantity: number; reorderPoint?: number }[] = [
    { slug: "stk-latitude5530", catalogItem: "ci-latitude5530", location: "loc-storage", quantity: 12 },
    { slug: "stk-elitebook840", catalogItem: "ci-elitebook840", location: "loc-storage", quantity: 8 },
    { slug: "stk-macbookpro14", catalogItem: "ci-macbookpro14", location: "loc-storage", quantity: 4 },
    { slug: "stk-optiplex7080", catalogItem: "ci-optiplex7080", location: "loc-storage", quantity: 15 },
    { slug: "stk-thinkcentrem70q", catalogItem: "ci-thinkcentrem70q", location: "loc-storage", quantity: 10 },
    { slug: "stk-laserjetm404n", catalogItem: "ci-laserjetm404n", location: "loc-storage", quantity: 5 },
    { slug: "stk-monitor27", catalogItem: "ci-monitor27", location: "loc-storage", quantity: 22 },
    { slug: "stk-dockingstation", catalogItem: "ci-dockingstation", location: "loc-storage", quantity: 18, reorderPoint: 4 },
    { slug: "stk-usbccables", catalogItem: "ci-usbccables", location: "loc-storage", quantity: 2, reorderPoint: 5 },
    { slug: "stk-hdmicables", catalogItem: "ci-hdmicables", location: "loc-storage", quantity: 8, reorderPoint: 5 },
    { slug: "stk-usbabcables", catalogItem: "ci-usbabcables", location: "loc-storage", quantity: 5, reorderPoint: 3 },
    { slug: "stk-toner58a", catalogItem: "ci-toner58a", location: "loc-storage", quantity: 0, reorderPoint: 2 },
    { slug: "stk-wirelessmice", catalogItem: "ci-wirelessmice", location: "loc-storage", quantity: 3, reorderPoint: 3 },
    { slug: "stk-powerAdapters", catalogItem: "ci-powerAdapters", location: "loc-storage", quantity: 0, reorderPoint: 2 },
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
    "stk-latitude5530": 4,
    "stk-elitebook840": 3,
    "stk-macbookpro14": 3,
    "stk-optiplex7080": 5,
    "stk-thinkcentrem70q": 4,
    "stk-laserjetm404n": 2,
    "stk-monitor27": 13,
    "stk-dockingstation": 11,
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

  await db.insert(softwareLicenses).values([
    { id: id("lic-microsoft365"), catalogItemId: id("ci-microsoft365"), licenseType: "subscription", totalSeats: 10, renewalDate: "2027-01-15", vendorId: id("ven-microsoft") },
    { id: id("lic-adobecc"), catalogItemId: id("ci-adobecc"), licenseType: "subscription", totalSeats: 5, renewalDate: "2027-07-05", vendorId: id("ven-adobe") },
    { id: id("lic-zoom"), catalogItemId: id("ci-zoom"), licenseType: "subscription", totalSeats: 10, renewalDate: "2026-09-20", vendorId: id("ven-zoom") },
    { id: id("lic-slack"), catalogItemId: id("ci-slack"), licenseType: "subscription", totalSeats: 10, renewalDate: "2026-12-01", vendorId: id("ven-salesforce") },
    { id: id("lic-autocad2024"), catalogItemId: id("ci-autocad2024"), licenseType: "perpetual", totalSeats: 3, vendorId: id("ven-autodesk") },
    { id: id("lic-windows11pro"), catalogItemId: id("ci-windows11pro"), licenseType: "volume", totalSeats: 10, vendorId: id("ven-microsoft") },
    { id: id("lic-nortonav"), catalogItemId: id("ci-nortonav"), licenseType: "subscription", totalSeats: 10, renewalDate: "2026-10-10", vendorId: id("ven-nortonlifelock") },
  ]);

  const allUserSlugs = ["usr-esther", "usr-john", "usr-sarah", "usr-michael", "usr-jennifer", "usr-robert", "usr-linda"];
  const allAssetSlugs = ["ast-1", "ast-2", "ast-3", "ast-4", "ast-5", "ast-6", "ast-7", "ast-8", "ast-9", "ast-10"];

  const assignToUsers = (licenseSlug: string, userSlugs: string[], assignedAt: string) =>
    userSlugs.map((userSlug) => ({
      id: id(`sa-${licenseSlug}-${userSlug}`),
      softwareLicenseId: id(licenseSlug),
      userId: id(userSlug),
      assignedAt: new Date(assignedAt),
    }));

  const assignToAssets = (licenseSlug: string, assetSlugs: string[], assignedAt: string) =>
    assetSlugs.map((assetSlug) => ({
      id: id(`sa-${licenseSlug}-${assetSlug}`),
      softwareLicenseId: id(licenseSlug),
      assetId: id(assetSlug),
      assignedAt: new Date(assignedAt),
    }));

  await db.insert(softwareAssignments).values([
    ...assignToUsers("lic-microsoft365", allUserSlugs, "2024-01-15"),
    ...assignToUsers("lic-adobecc", ["usr-esther", "usr-john"], "2024-01-20"),
    ...assignToUsers("lic-zoom", allUserSlugs.filter((s) => s !== "usr-linda"), "2024-01-15"),
    ...assignToUsers("lic-slack", allUserSlugs, "2024-01-15"),
    ...assignToUsers("lic-autocad2024", ["usr-robert"], "2024-02-01"),
    ...assignToAssets("lic-windows11pro", allAssetSlugs, "2024-01-10"),
    ...assignToUsers("lic-nortonav", allUserSlugs, "2024-01-15"),
  ]);

  const assetPurchaseDates: Record<string, string> = {
    "ast-1": "2021-03-01",
    "ast-2": "2021-06-15",
    "ast-3": "2023-10-01",
    "ast-4": "2022-10-25",
    "ast-5": "2025-01-15",
    "ast-6": "2024-11-01",
    "ast-7": "2024-03-01",
    "ast-8": "2020-01-01",
    "ast-9": "2023-11-20",
    "ast-10": "2022-01-15",
  };
  const assetLocations: Record<string, string> = {
    "ast-1": "loc-main",
    "ast-2": "loc-main",
    "ast-3": "loc-helpdesk",
    "ast-4": "loc-main",
    "ast-5": "loc-main",
    "ast-6": "loc-storage",
    "ast-7": "loc-storage",
    "ast-8": "loc-warehouse",
    "ast-9": "loc-helpdesk",
    "ast-10": "loc-main",
  };
  const assetAssignees: Record<string, string> = {
    "ast-1": "usr-john",
    "ast-2": "usr-sarah",
    "ast-3": "usr-esther",
    "ast-4": "usr-jennifer",
    "ast-5": "usr-michael",
    "ast-9": "usr-robert",
    "ast-10": "usr-john",
  };

  const purchasedEvents = allAssetSlugs.map((slug) => ({
    id: id(`evt-${slug}-purchased`),
    assetId: id(slug),
    type: "purchased" as const,
    toLocationId: id(assetLocations[slug]),
    createdAt: new Date(assetPurchaseDates[slug]),
  }));

  const assignedEvents = Object.entries(assetAssignees).map(([slug, userSlug]) => ({
    id: id(`evt-${slug}-assigned`),
    assetId: id(slug),
    type: "assigned" as const,
    toUserId: id(userSlug),
    toLocationId: id(assetLocations[slug]),
    createdAt: new Date(assetPurchaseDates[slug] ?? "2024-01-01"),
  }));

  await db.insert(assetEvents).values([
    ...purchasedEvents,
    ...assignedEvents,
    { id: id("evt-ast-9-repair"), assetId: id("ast-9"), type: "repair_started", createdAt: new Date("2026-08-20"), notes: "Screen replacement" },
    { id: id("evt-ast-8-retired"), assetId: id("ast-8"), type: "retired", createdAt: new Date("2025-11-01"), notes: "End of life, replaced by LAP-007" },
  ]);

  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
