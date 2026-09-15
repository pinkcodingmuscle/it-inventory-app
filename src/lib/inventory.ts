import type { AppData, ID, InventoryTransaction, StockItem } from "../types/domain";

export type StockStatus = "ok" | "low" | "out";

export function getStockStatus(quantity: number, reorderPoint: number): StockStatus {
  if (quantity === 0) return "out";
  if (quantity <= reorderPoint) return "low";
  return "ok";
}

export function getReorderPoint(item: StockItem, data: AppData): number {
  return item.reorderPoint ?? data.catalogItems[item.catalogItemId]?.reorderPoint ?? 0;
}

/** Net units checked out and not yet returned for a catalog item at a location. */
export function getCheckedOutQuantity(
  catalogItemId: ID,
  locationId: ID,
  transactions: Record<ID, InventoryTransaction>
): number {
  let checkedOut = 0;
  for (const txn of Object.values(transactions)) {
    if (txn.catalogItemId !== catalogItemId || txn.locationId !== locationId) continue;
    if (txn.type === "checkout") checkedOut += txn.quantity;
    if (txn.type === "return") checkedOut -= txn.quantity;
  }
  return Math.max(0, checkedOut);
}

/** Units on hand and not already allocated to a checkout. */
export function getAvailableQuantity(item: StockItem, data: AppData): number {
  const checkedOut = getCheckedOutQuantity(item.catalogItemId, item.locationId, data.inventoryTransactions);
  return Math.max(0, item.quantity - checkedOut);
}

export function getInUseQuantity(item: StockItem, data: AppData): number {
  return item.quantity - getAvailableQuantity(item, data);
}
