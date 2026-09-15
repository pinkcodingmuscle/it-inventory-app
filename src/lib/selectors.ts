import { appData } from "../data/store";
import type {
  AssetStatus,
  CatalogItem,
  ID,
  PurchaseOrder,
  PurchaseOrderStatus,
  SoftwareLicense,
} from "../types/domain";
import { getAvailableQuantity, getInUseQuantity, getReorderPoint, getStockStatus, type StockStatus } from "./inventory";
import {
  formatMonthYear,
  formatRemaining,
  getAgeInYears,
  getDaysRemaining,
  getLifecycleBucket,
  getReplacementDueDate,
  lifecycleBucketLabels,
  type LifecycleBucket,
} from "./lifecycle";

const data = appData;

export const assetStatusLabels: Record<AssetStatus, string> = {
  active: "Active",
  in_storage: "In Storage",
  under_repair: "Under Repair",
  retired: "Retired",
};

export const purchaseOrderStatusLabels: Record<PurchaseOrderStatus, string> = {
  open: "Open",
  received: "Received",
  cancelled: "Cancelled",
};

export const stockStatusLabels: Record<StockStatus, string> = {
  ok: "OK",
  low: "Low",
  out: "Out",
};

// Category names are plural in the catalog ("Laptops"); a few pages want the
// singular device type instead ("Laptop").
const singularOverrides: Record<string, string> = {
  Laptops: "Laptop",
  Desktops: "Desktop",
  Printers: "Printer",
  Monitors: "Monitor",
};

export function singularCategory(category: string): string {
  return singularOverrides[category] ?? category.replace(/s$/, "");
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function getCatalogItem(id: ID): CatalogItem | undefined {
  return data.catalogItems[id];
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export interface AssetRow {
  id: ID;
  tag: string;
  name: string;
  type: string;
  serial: string;
  assignedTo: string;
  location: string;
  status: AssetStatus;
  statusLabel: string;
}

export function listAssets(): AssetRow[] {
  return Object.values(data.assets).map((asset) => {
    const catalogItem = getCatalogItem(asset.catalogItemId);
    return {
      id: asset.id,
      tag: asset.assetTag,
      name: catalogItem?.name ?? "Unknown item",
      type: catalogItem ? singularCategory(catalogItem.category) : "",
      serial: asset.serialNumber,
      assignedTo: asset.assignedUserId ? data.users[asset.assignedUserId]?.name ?? "—" : "—",
      location: data.locations[asset.locationId]?.name ?? "—",
      status: asset.status,
      statusLabel: assetStatusLabels[asset.status],
    };
  });
}

export function getAssetStats() {
  const assets = Object.values(data.assets);
  return {
    total: assets.length,
    active: assets.filter((a) => a.status === "active").length,
    inStorage: assets.filter((a) => a.status === "in_storage").length,
    underRepair: assets.filter((a) => a.status === "under_repair").length,
    retired: assets.filter((a) => a.status === "retired").length,
  };
}

// ---------------------------------------------------------------------------
// Stock (inventory + consumables)
// ---------------------------------------------------------------------------

export interface StockRow {
  id: ID;
  name: string;
  category: string;
  quantity: number;
  available: number;
  inUse: number;
  reorderPoint: number;
  status: StockStatus;
  statusLabel: string;
  location: string;
}

function toStockRow(itemId: ID): StockRow {
  const item = data.stockItems[itemId];
  const catalogItem = getCatalogItem(item.catalogItemId);
  const reorderPoint = getReorderPoint(item, data);
  return {
    id: item.id,
    name: catalogItem?.name ?? "Unknown item",
    category: catalogItem?.category ?? "",
    quantity: item.quantity,
    available: getAvailableQuantity(item, data),
    inUse: getInUseQuantity(item, data),
    reorderPoint,
    status: getStockStatus(item.quantity, reorderPoint),
    statusLabel: stockStatusLabels[getStockStatus(item.quantity, reorderPoint)],
    location: data.locations[item.locationId]?.name ?? "—",
  };
}

/** All bulk stock items (durable spares and consumables alike). */
export function listStockItems(): StockRow[] {
  return Object.keys(data.stockItems).map(toStockRow);
}

export function getInventoryStats() {
  const rows = listStockItems();
  return {
    totalQty: rows.reduce((sum, r) => sum + r.quantity, 0),
    totalAvailable: rows.reduce((sum, r) => sum + r.available, 0),
    outOfStock: rows.filter((r) => r.status === "out").length,
  };
}

/** Only the catalog items classified as consumables (cables, toner, batteries, ...). */
export function listConsumables(): StockRow[] {
  return listStockItems().filter((row) => {
    const item = data.stockItems[row.id];
    return getCatalogItem(item.catalogItemId)?.type === "consumable";
  });
}

export function getConsumableStats() {
  const rows = listConsumables();
  return {
    itemTypes: rows.length,
    lowCount: rows.filter((r) => r.status === "low").length,
    outCount: rows.filter((r) => r.status === "out").length,
  };
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export interface LocationRow {
  id: ID;
  name: string;
  type: string;
  typeLabel: string;
  assetCount: number;
  manager: string;
  notes: string;
}

const locationTypeLabels: Record<string, string> = {
  storage: "Storage",
  office: "Office",
  meeting_room: "Meeting",
  remote: "Remote",
};

export function countAssetsAtLocation(locationId: ID): number {
  return Object.values(data.assets).filter((a) => a.locationId === locationId).length;
}

export function listLocations(): LocationRow[] {
  return Object.values(data.locations).map((loc) => ({
    id: loc.id,
    name: loc.name,
    type: loc.type,
    typeLabel: locationTypeLabels[loc.type] ?? loc.type,
    assetCount: countAssetsAtLocation(loc.id),
    manager: loc.managerUserId ? data.users[loc.managerUserId]?.name ?? "Unassigned" : "Unassigned",
    notes: loc.notes ?? "",
  }));
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

export interface VendorRow {
  id: ID;
  name: string;
  category: string;
  categoryLabel: string;
  contact: string;
  email: string;
  phone: string;
  suppliedCount: number;
}

const vendorCategoryLabels: Record<string, string> = {
  hardware: "Hardware",
  software: "Software",
  accessories: "Accessories",
  other: "Other",
};

export function countAssetsFromVendor(vendorId: ID): number {
  return Object.values(data.assets).filter((a) => getCatalogItem(a.catalogItemId)?.vendorId === vendorId).length;
}

export function listVendors(): VendorRow[] {
  return Object.values(data.vendors).map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    category: vendor.category,
    categoryLabel: vendorCategoryLabels[vendor.category] ?? vendor.category,
    contact: vendor.contactName ?? "—",
    email: vendor.email ?? "—",
    phone: vendor.phone ?? "—",
    suppliedCount: countAssetsFromVendor(vendor.id),
  }));
}

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------

export interface PurchaseOrderRow {
  id: ID;
  poNumber: string;
  vendor: string;
  items: string;
  date: string;
  total: number;
  totalLabel: string;
  status: PurchaseOrderStatus;
  statusLabel: string;
}

export function getPurchaseOrderTotal(po: PurchaseOrder): number {
  return Object.values(data.purchaseOrderLines)
    .filter((line) => line.purchaseOrderId === po.id)
    .reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

function getPurchaseOrderItemsLabel(po: PurchaseOrder): string {
  const lines = Object.values(data.purchaseOrderLines).filter((line) => line.purchaseOrderId === po.id);
  return lines
    .map((line) => `${line.quantity}× ${getCatalogItem(line.catalogItemId)?.name ?? "Unknown item"}`)
    .join(", ");
}

export function listPurchaseOrders(): PurchaseOrderRow[] {
  return Object.values(data.purchaseOrders)
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    .map((po) => {
      const total = getPurchaseOrderTotal(po);
      return {
        id: po.id,
        poNumber: po.purchaseOrderNumber,
        vendor: data.vendors[po.vendorId]?.name ?? "Unknown vendor",
        items: getPurchaseOrderItemsLabel(po),
        date: new Date(po.orderDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
        total,
        totalLabel: formatCurrency(total),
        status: po.status,
        statusLabel: purchaseOrderStatusLabels[po.status],
      };
    });
}

export function getPurchaseStats() {
  const orders = Object.values(data.purchaseOrders);
  const totalSpend = orders
    .filter((po) => po.status !== "cancelled")
    .reduce((sum, po) => sum + getPurchaseOrderTotal(po), 0);
  return {
    openCount: orders.filter((po) => po.status === "open").length,
    receivedCount: orders.filter((po) => po.status === "received").length,
    totalSpend,
    totalSpendLabel: formatCurrency(totalSpend),
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface UserRow {
  id: ID;
  name: string;
  initials: string;
  role: string;
  department: string;
  email: string;
  assetCount: number;
  status: "active" | "inactive";
  statusLabel: string;
}

export function countAssetsForUser(userId: ID): number {
  return Object.values(data.assets).filter((a) => a.assignedUserId === userId).length;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function listUsers(): UserRow[] {
  return Object.values(data.users).map((user) => ({
    id: user.id,
    name: user.name,
    initials: initialsFromName(user.name),
    role: user.role,
    department: user.departmentId ? data.departments[user.departmentId]?.name ?? "—" : "—",
    email: user.email,
    assetCount: countAssetsForUser(user.id),
    status: user.status,
    statusLabel: user.status === "active" ? "Active" : "Inactive",
  }));
}

export function getUserStats() {
  const rows = Object.values(data.users);
  return {
    total: rows.length,
    active: rows.filter((u) => u.status === "active").length,
    inactive: rows.filter((u) => u.status === "inactive").length,
  };
}

// ---------------------------------------------------------------------------
// Software licenses
// ---------------------------------------------------------------------------

export type SoftwareStatus = "active" | "expiring_soon" | "expired";

export interface SoftwareLicenseRow {
  id: ID;
  name: string;
  vendor: string;
  type: string;
  seats: number;
  used: number;
  expiry: string;
  status: SoftwareStatus;
  statusLabel: string;
}

const licenseTypeLabels: Record<string, string> = {
  subscription: "Subscription",
  perpetual: "Perpetual",
  volume: "Volume",
};

export const softwareStatusLabels: Record<SoftwareStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
};

const EXPIRING_SOON_WINDOW_DAYS = 60;

export function getUsedSeats(license: SoftwareLicense): number {
  return Object.values(data.softwareAssignments).filter(
    (a) => a.softwareLicenseId === license.id && !a.revokedAt
  ).length;
}

function getSoftwareStatus(license: SoftwareLicense, now: Date = new Date()): SoftwareStatus {
  if (!license.renewalDate) return "active";
  const daysRemaining = getDaysRemaining(new Date(license.renewalDate), now);
  if (daysRemaining === undefined) return "active";
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= EXPIRING_SOON_WINDOW_DAYS) return "expiring_soon";
  return "active";
}

export function listSoftwareLicenses(): SoftwareLicenseRow[] {
  return Object.values(data.softwareLicenses).map((license) => {
    const status = getSoftwareStatus(license);
    return {
      id: license.id,
      name: getCatalogItem(license.catalogItemId)?.name ?? "Unknown software",
      vendor: license.vendorId ? data.vendors[license.vendorId]?.name ?? "—" : "—",
      type: licenseTypeLabels[license.licenseType],
      seats: license.totalSeats,
      used: getUsedSeats(license),
      expiry: license.renewalDate ? formatMonthYear(new Date(license.renewalDate)) : "N/A",
      status,
      statusLabel: softwareStatusLabels[status],
    };
  });
}

export function getSoftwareStats() {
  const rows = listSoftwareLicenses();
  return {
    totalLicenses: rows.length,
    expiringCount: rows.filter((r) => r.status === "expiring_soon").length,
    seatsAvailable: rows.reduce((sum, r) => sum + (r.seats - r.used), 0),
  };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export interface LifecycleRow {
  id: ID;
  name: string;
  type: string;
  assignedTo: string;
  purchaseDate: string;
  age: string;
  dueDate: string;
  remaining: string;
  daysRemaining?: number;
  bucket: LifecycleBucket;
  bucketLabel: string;
}

export function listAssetLifecycle(now: Date = new Date()): LifecycleRow[] {
  return Object.values(data.assets).map((asset) => {
    const catalogItem = getCatalogItem(asset.catalogItemId);
    const dueDate = getReplacementDueDate(asset, catalogItem);
    const daysRemaining = getDaysRemaining(dueDate, now);
    const ageYears = getAgeInYears(asset.purchaseDate, now);
    const bucket = getLifecycleBucket(daysRemaining);
    return {
      id: asset.id,
      name: catalogItem?.name ?? "Unknown item",
      type: catalogItem ? singularCategory(catalogItem.category) : "",
      assignedTo: asset.assignedUserId ? data.users[asset.assignedUserId]?.name ?? "—" : "—",
      purchaseDate: asset.purchaseDate ? formatMonthYear(new Date(asset.purchaseDate)) : "N/A",
      age: ageYears !== undefined ? `${ageYears.toFixed(1)} yrs` : "N/A",
      dueDate: formatMonthYear(dueDate),
      remaining: formatRemaining(daysRemaining),
      daysRemaining,
      bucket,
      bucketLabel: lifecycleBucketLabels[bucket],
    };
  });
}

export function getLifecycleStats(now: Date = new Date()) {
  const rows = listAssetLifecycle(now);
  const thisYear = now.getFullYear();
  const replacedThisYear = Object.values(data.assetEvents).filter(
    (e) => e.type === "retired" && new Date(e.createdAt).getFullYear() === thisYear
  ).length;
  return {
    pastEol: rows.filter((r) => r.bucket === "past_eol").length,
    dueIn90Days: rows.filter((r) => ["0_30", "31_60", "61_90"].includes(r.bucket)).length,
    replacedThisYear,
  };
}

// ---------------------------------------------------------------------------
// Dashboard aggregates
// ---------------------------------------------------------------------------

const categoryColors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#94a3b8", "#0ea5e9"];

export interface DonutEntry {
  name: string;
  value: number;
  color: string;
}

function toDonutEntries(counts: Map<string, number>): DonutEntry[] {
  return Array.from(counts.entries()).map(([name, value], i) => ({
    name,
    value,
    color: categoryColors[i % categoryColors.length],
  }));
}

export function getAssetsByCategory(): DonutEntry[] {
  const counts = new Map<string, number>();
  for (const asset of Object.values(data.assets)) {
    const category = getCatalogItem(asset.catalogItemId)?.category ?? "Other";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return toDonutEntries(counts);
}

export function getInventoryStatusBreakdown(): DonutEntry[] {
  const rows = listStockItems();
  const onOrder = Object.values(data.purchaseOrderLines).filter(
    (line) => data.purchaseOrders[line.purchaseOrderId]?.status === "open"
  ).length;
  return [
    { name: "In Stock", value: rows.filter((r) => r.status === "ok").length, color: "#10b981" },
    { name: "Low Stock", value: rows.filter((r) => r.status === "low").length, color: "#f59e0b" },
    { name: "On Order", value: onOrder, color: "#6366f1" },
    { name: "Out of Stock", value: rows.filter((r) => r.status === "out").length, color: "#f43f5e" },
  ];
}

export function getLifecycleAgeBreakdown(now: Date = new Date()): DonutEntry[] {
  const buckets = { "0–6 months": 0, "6–12 months": 0, "1–2 years": 0, "2–3 years": 0, "3+ years": 0, "No Date": 0 };
  for (const asset of Object.values(data.assets)) {
    const ageYears = getAgeInYears(asset.purchaseDate, now);
    if (ageYears === undefined) buckets["No Date"]++;
    else if (ageYears < 0.5) buckets["0–6 months"]++;
    else if (ageYears < 1) buckets["6–12 months"]++;
    else if (ageYears < 2) buckets["1–2 years"]++;
    else if (ageYears < 3) buckets["2–3 years"]++;
    else buckets["3+ years"]++;
  }
  const colors = ["#10b981", "#06b6d4", "#6366f1", "#8b5cf6", "#f43f5e", "#94a3b8"];
  return Object.entries(buckets).map(([name, value], i) => ({ name, value, color: colors[i] }));
}

const eolBucketOrder: LifecycleBucket[] = ["past_eol", "0_30", "31_60", "61_90", "91_180", "181_365"];
const eolBucketColors: Record<LifecycleBucket, string> = {
  past_eol: "text-red-600",
  "0_30": "text-red-500",
  "31_60": "text-orange-500",
  "61_90": "text-amber-600",
  "91_180": "text-gray-700",
  "181_365": "text-gray-700",
  on_track: "text-gray-700",
  no_date: "text-gray-400",
};

export function getEolBuckets(now: Date = new Date()) {
  const rows = listAssetLifecycle(now);
  return eolBucketOrder.map((bucket) => ({
    bucket,
    label: lifecycleBucketLabels[bucket],
    count: rows.filter((r) => r.bucket === bucket).length,
    color: eolBucketColors[bucket],
  }));
}

export function getLifecycleTimeline(now: Date = new Date()) {
  const rows = listAssetLifecycle(now);
  const order: { bucket: LifecycleBucket; label: string }[] = [
    { bucket: "past_eol", label: "Past EOL" },
    { bucket: "0_30", label: "0–30" },
    { bucket: "31_60", label: "31–60" },
    { bucket: "61_90", label: "61–90" },
    { bucket: "91_180", label: "91–180" },
    { bucket: "181_365", label: "181–365" },
    { bucket: "on_track", label: "On Track" },
    { bucket: "no_date", label: "No Date" },
  ];
  return order.map(({ bucket, label }) => ({ label, count: rows.filter((r) => r.bucket === bucket).length }));
}

export function getTopLocations(limit = 5) {
  return listLocations()
    .sort((a, b) => b.assetCount - a.assetCount)
    .slice(0, limit)
    .map((loc) => ({ name: loc.name, assets: loc.assetCount }));
}

export function getRecentPurchases(limit = 5) {
  return listPurchaseOrders()
    .slice(0, limit)
    .map((po) => ({ item: po.items, vendor: po.vendor, date: po.date, amount: po.totalLabel }));
}

export function getEolAssetsTable(now: Date = new Date(), limit = 5) {
  return listAssetLifecycle(now)
    .filter((r) => r.daysRemaining !== undefined)
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
    .slice(0, limit)
    .map((row) => {
      const asset = data.assets[row.id];
      return {
        tag: asset.assetTag,
        name: row.name,
        category: row.type,
        assignedTo: row.assignedTo,
        dueDate: row.dueDate,
        remaining: row.remaining,
        status: row.bucketLabel,
        bucket: row.bucket,
      };
    });
}

export function getTotalAssetValue(): number {
  const assetValue = Object.values(data.assets).reduce(
    (sum, asset) => sum + (getCatalogItem(asset.catalogItemId)?.unitPrice ?? 0),
    0
  );
  const stockValue = Object.values(data.stockItems).reduce(
    (sum, item) => sum + item.quantity * (getCatalogItem(item.catalogItemId)?.unitPrice ?? 0),
    0
  );
  return assetValue + stockValue;
}

export function getDashboardStats(now: Date = new Date()) {
  const assetStats = getAssetStats();
  const lifecycleStats = getLifecycleStats(now);
  const assigned = Object.values(data.assets).filter((a) => a.assignedUserId).length;
  return {
    totalAssets: assetStats.total,
    assignedAssets: assigned,
    availableAssets: assetStats.total - assigned,
    assetsNearEol: lifecycleStats.dueIn90Days,
    assetsPastEol: lifecycleStats.pastEol,
    totalAssetValue: getTotalAssetValue(),
    totalAssetValueLabel: formatCurrency(getTotalAssetValue()),
  };
}
