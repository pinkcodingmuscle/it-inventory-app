import type { AppData } from "../types/domain";

// Populated at runtime from the backend API (see DataContext) and read by the
// pure selector functions in ../lib/selectors. Kept as a single mutable
// object (rather than React state) so those selectors can stay plain
// functions; DataContext's `revision` counter is what actually triggers
// re-renders after a refresh.
export const appData: AppData = {
  catalogItems: {},
  assets: {},
  stockItems: {},
  inventoryTransactions: {},
  users: {},
  departments: {},
  locations: {},
  vendors: {},
  purchaseOrders: {},
  purchaseOrderLines: {},
  softwareLicenses: {},
  softwareAssignments: {},
  assetEvents: {},
};

export function setAppData(next: AppData): void {
  Object.assign(appData, next);
}
