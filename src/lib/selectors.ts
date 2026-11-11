import { appData } from "../data/store";
import type { CatalogItem, CatalogItemType, ID, PurchaseOrder, PurchaseOrderStatus } from "../types/domain";
import { getAvailableQuantity, getInUseQuantity, getReorderPoint, getStockStatus, type StockStatus } from "./inventory";
import { loadSettings } from "./settings";

const data = appData;

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

/** Money everywhere in the app: Settings currency, always with cents (e.g. $70.50). */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: loadSettings().currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getCatalogItem(id: ID): CatalogItem | undefined {
  return data.catalogItems[id];
}

// ---------------------------------------------------------------------------
// Stock (inventory + consumables)
// ---------------------------------------------------------------------------

export interface StockRow {
  id: ID;
  catalogItemId: ID;
  locationId: ID;
  type: CatalogItemType | undefined;
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
  const status = getStockStatus(item.quantity, reorderPoint);
  return {
    id: item.id,
    catalogItemId: item.catalogItemId,
    locationId: item.locationId,
    type: catalogItem?.type,
    name: catalogItem?.name ?? "Unknown item",
    category: catalogItem?.category ?? "",
    quantity: item.quantity,
    available: getAvailableQuantity(item),
    inUse: getInUseQuantity(item),
    reorderPoint,
    status,
    statusLabel: stockStatusLabels[status],
    location: data.locations[item.locationId]?.name ?? "—",
  };
}

/** All bulk stock items (accessories and consumables alike). */
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

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export interface LocationRow {
  id: ID;
  name: string;
  type: string;
  typeLabel: string;
  stockItemCount: number;
  totalUnits: number;
  manager: string;
  notes: string;
}

const locationTypeLabels: Record<string, string> = {
  storage: "Storage",
  office: "Office",
  meeting_room: "Meeting",
  remote: "Remote",
};

export function listLocations(): LocationRow[] {
  const stock = Object.values(data.stockItems);
  return Object.values(data.locations).map((loc) => {
    const atLocation = stock.filter((s) => s.locationId === loc.id);
    return {
      id: loc.id,
      name: loc.name,
      type: loc.type,
      typeLabel: locationTypeLabels[loc.type] ?? loc.type,
      stockItemCount: atLocation.length,
      totalUnits: atLocation.reduce((sum, s) => sum + s.quantity, 0),
      manager: loc.managerUserId ? data.users[loc.managerUserId]?.name ?? "Unassigned" : "Unassigned",
      notes: loc.notes ?? "",
    };
  });
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

export function countItemsFromVendor(vendorId: ID): number {
  return Object.values(data.catalogItems).filter((item) => item.vendorId === vendorId).length;
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
    suppliedCount: countItemsFromVendor(vendor.id),
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

/** Units on hand per catalog category. */
export function getStockByCategory(): DonutEntry[] {
  const counts = new Map<string, number>();
  for (const item of Object.values(data.stockItems)) {
    const category = getCatalogItem(item.catalogItemId)?.category ?? "Other";
    counts.set(category, (counts.get(category) ?? 0) + item.quantity);
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

export function getTopLocations(limit = 5) {
  return listLocations()
    .sort((a, b) => b.totalUnits - a.totalUnits)
    .slice(0, limit)
    .map((loc) => ({ name: loc.name, units: loc.totalUnits }));
}

export function getRecentPurchases(limit = 5) {
  return listPurchaseOrders()
    .slice(0, limit)
    .map((po) => ({ item: po.items, vendor: po.vendor, date: po.date, amount: po.totalLabel }));
}

/** Stock lines at or below their reorder point, emptiest first. */
export function getLowStockTable(limit = 5) {
  return listStockItems()
    .filter((r) => r.status !== "ok")
    .sort((a, b) => a.quantity - a.reorderPoint - (b.quantity - b.reorderPoint))
    .slice(0, limit);
}

export function getTotalInventoryValue(): number {
  return Object.values(data.stockItems).reduce(
    (sum, item) => sum + item.quantity * (getCatalogItem(item.catalogItemId)?.unitPrice ?? 0),
    0
  );
}

export function getDashboardStats() {
  const rows = listStockItems();
  const totalValue = getTotalInventoryValue();
  return {
    itemTypes: Object.keys(data.catalogItems).length,
    totalUnits: rows.reduce((sum, r) => sum + r.quantity, 0),
    availableUnits: rows.reduce((sum, r) => sum + r.available, 0),
    lowStock: rows.filter((r) => r.status === "low").length,
    outOfStock: rows.filter((r) => r.status === "out").length,
    totalInventoryValueLabel: formatCurrency(totalValue),
  };
}
