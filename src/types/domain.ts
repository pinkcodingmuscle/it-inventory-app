// Shared domain model for the IT inventory application.
// See docs/data-structure-proposal.md for the design rationale.

export type ID = string;

export type CatalogItemType = "consumable" | "accessory";

export type PurchaseOrderStatus = "open" | "received" | "cancelled";

export type InventoryTransactionType =
  | "purchase"
  | "receipt"
  | "checkout"
  | "return"
  | "adjustment"
  | "disposal";

export interface CatalogItem {
  id: ID;
  name: string;
  category: string;
  type: CatalogItemType;
  manufacturer?: string;
  model?: string;
  vendorId?: ID;
  reorderPoint?: number;
  unitPrice?: number;
}

export interface StockItem {
  id: ID;
  catalogItemId: ID;
  locationId: ID;
  quantity: number;
  reorderPoint?: number;
  /** Units currently checked out (net of returns), computed by the API. */
  checkedOut: number;
}

export interface InventoryTransaction {
  id: ID;
  catalogItemId: ID;
  locationId: ID;
  type: InventoryTransactionType;
  quantity: number;
  performedByUserId: ID;
  relatedPurchaseOrderId?: ID;
  createdAt: string;
  notes?: string;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  role: string;
  departmentId?: ID;
  status: "active" | "inactive";
}

export interface Department {
  id: ID;
  name: string;
}

export interface Location {
  id: ID;
  name: string;
  type: "office" | "storage" | "meeting_room" | "remote";
  managerUserId?: ID;
  notes?: string;
}

export interface Vendor {
  id: ID;
  name: string;
  category: "hardware" | "software" | "accessories" | "other";
  contactName?: string;
  email?: string;
  phone?: string;
}

export interface PurchaseOrder {
  id: ID;
  purchaseOrderNumber: string;
  vendorId: ID;
  orderDate: string;
  status: PurchaseOrderStatus;
  notes?: string;
}

export interface PurchaseOrderLine {
  id: ID;
  purchaseOrderId: ID;
  catalogItemId: ID;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
}

export interface AppData {
  catalogItems: Record<ID, CatalogItem>;
  stockItems: Record<ID, StockItem>;
  users: Record<ID, User>;
  departments: Record<ID, Department>;
  locations: Record<ID, Location>;
  vendors: Record<ID, Vendor>;
  purchaseOrders: Record<ID, PurchaseOrder>;
  purchaseOrderLines: Record<ID, PurchaseOrderLine>;
}
