import type { AppData, StockItem } from "../types/domain";
import { loadSettings } from "./settings";

export type StockStatus = "ok" | "low" | "out";

export function getStockStatus(quantity: number, reorderPoint: number): StockStatus {
  if (quantity === 0) return "out";
  if (quantity <= reorderPoint) return "low";
  return "ok";
}

/** The item's own reorder point, else its catalog item's, else the default threshold from Settings. */
export function getReorderPoint(item: StockItem, data: AppData): number {
  return item.reorderPoint ?? data.catalogItems[item.catalogItemId]?.reorderPoint ?? loadSettings().lowStockThreshold;
}

// `checkedOut` (net checkouts minus returns) is computed by the API in one
// grouped query, so the browser doesn't need the transaction history for it.

/** Units on hand and not already allocated to a checkout. */
export function getAvailableQuantity(item: StockItem): number {
  return Math.max(0, item.quantity - (item.checkedOut ?? 0));
}

export function getInUseQuantity(item: StockItem): number {
  return item.quantity - getAvailableQuantity(item);
}
