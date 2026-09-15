// Shared domain model for the IT inventory application.
// See docs/data-structure-proposal.md for the design rationale.

export type ID = string;

export type CatalogItemType = "asset" | "consumable" | "accessory" | "software";

export type AssetStatus = "active" | "in_storage" | "under_repair" | "retired";

export type PurchaseOrderStatus = "open" | "received" | "cancelled";

export type InventoryTransactionType =
  | "purchase"
  | "receipt"
  | "checkout"
  | "return"
  | "adjustment"
  | "disposal";

export type LicenseType = "subscription" | "perpetual" | "volume";

export type AssetEventType =
  | "purchased"
  | "assigned"
  | "returned"
  | "moved"
  | "repair_started"
  | "repair_completed"
  | "retired";

export interface CatalogItem {
  id: ID;
  name: string;
  category: string;
  type: CatalogItemType;
  manufacturer?: string;
  model?: string;
  vendorId?: ID;
  reorderPoint?: number;
  lifecycleMonths?: number;
  unitPrice?: number;
}

export interface Asset {
  id: ID;
  catalogItemId: ID;
  assetTag: string;
  serialNumber: string;
  status: AssetStatus;
  purchaseOrderId?: ID;
  purchaseDate?: string;
  warrantyEndDate?: string;
  locationId: ID;
  assignedUserId?: ID;
  notes?: string;
}

export interface StockItem {
  id: ID;
  catalogItemId: ID;
  locationId: ID;
  quantity: number;
  reorderPoint?: number;
}

export interface InventoryTransaction {
  id: ID;
  catalogItemId: ID;
  locationId: ID;
  type: InventoryTransactionType;
  quantity: number;
  performedByUserId: ID;
  relatedAssetId?: ID;
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

export interface SoftwareLicense {
  id: ID;
  catalogItemId: ID;
  licenseType: LicenseType;
  totalSeats: number;
  renewalDate?: string;
  vendorId?: ID;
}

export interface SoftwareAssignment {
  id: ID;
  softwareLicenseId: ID;
  userId?: ID;
  assetId?: ID;
  assignedAt: string;
  revokedAt?: string;
}

export interface AssetEvent {
  id: ID;
  assetId: ID;
  type: AssetEventType;
  fromUserId?: ID;
  toUserId?: ID;
  fromLocationId?: ID;
  toLocationId?: ID;
  createdAt: string;
  notes?: string;
}

export interface AppData {
  catalogItems: Record<ID, CatalogItem>;
  assets: Record<ID, Asset>;
  stockItems: Record<ID, StockItem>;
  inventoryTransactions: Record<ID, InventoryTransaction>;
  users: Record<ID, User>;
  departments: Record<ID, Department>;
  locations: Record<ID, Location>;
  vendors: Record<ID, Vendor>;
  purchaseOrders: Record<ID, PurchaseOrder>;
  purchaseOrderLines: Record<ID, PurchaseOrderLine>;
  softwareLicenses: Record<ID, SoftwareLicense>;
  softwareAssignments: Record<ID, SoftwareAssignment>;
  assetEvents: Record<ID, AssetEvent>;
}
