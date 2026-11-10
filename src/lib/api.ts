import type {
  AppData,
  CatalogItem,
  Department,
  InventoryTransaction,
  Location,
  PurchaseOrder,
  PurchaseOrderLine,
  StockItem,
  User,
  Vendor,
} from "../types/domain";
import { byId } from "./byId";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Zod validation failures carry per-field messages; surface the first one.
    const fieldErrors: Record<string, string[] | undefined> = body.details?.fieldErrors ?? {};
    const firstField = Object.entries(fieldErrors).find(([, msgs]) => msgs?.length);
    const detail = firstField ? `${firstField[0]}: ${firstField[1]![0]}` : null;
    throw new Error(
      detail ? `${body.error}: ${detail}` : body.error ?? `Request to ${path} failed with status ${res.status}`
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function fetchAppData(): Promise<AppData> {
  const [
    departments,
    users,
    locations,
    vendors,
    catalogItems,
    stockItems,
    purchaseOrderData,
    inventoryTransactions,
  ] = await Promise.all([
    apiFetch<Department[]>("/departments"),
    apiFetch<User[]>("/users"),
    apiFetch<Location[]>("/locations"),
    apiFetch<Vendor[]>("/vendors"),
    apiFetch<CatalogItem[]>("/catalog-items"),
    apiFetch<StockItem[]>("/stock"),
    apiFetch<{ purchaseOrders: PurchaseOrder[]; purchaseOrderLines: PurchaseOrderLine[] }>("/purchase-orders"),
    apiFetch<InventoryTransaction[]>("/inventory-transactions"),
  ]);

  return {
    departments: byId(departments),
    users: byId(users),
    locations: byId(locations),
    vendors: byId(vendors),
    catalogItems: byId(catalogItems),
    stockItems: byId(stockItems),
    purchaseOrders: byId(purchaseOrderData.purchaseOrders),
    purchaseOrderLines: byId(purchaseOrderData.purchaseOrderLines),
    inventoryTransactions: byId(inventoryTransactions),
  };
}

export interface CreateLocationInput {
  name: string;
  type: Location["type"];
  managerUserId?: string;
  notes?: string;
}

export function createLocation(input: CreateLocationInput): Promise<Location> {
  return apiFetch<Location>("/locations", { method: "POST", body: JSON.stringify(input) });
}

export function deleteLocation(id: string): Promise<void> {
  return apiFetch<void>(`/locations/${id}`, { method: "DELETE" });
}

const post = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export type CreateVendorInput = Omit<Vendor, "id">;

export function createVendor(input: CreateVendorInput): Promise<Vendor> {
  return post<Vendor>("/vendors", input);
}

export type CreateCatalogItemInput = Omit<CatalogItem, "id">;

export function createCatalogItem(input: CreateCatalogItemInput): Promise<CatalogItem> {
  return post<CatalogItem>("/catalog-items", input);
}

export interface CreateStockItemInput {
  catalogItemId: string;
  locationId: string;
  quantity: number;
  reorderPoint?: number;
  notes?: string;
}

export function createStockItem(input: CreateStockItemInput) {
  return post<{ stockItem: StockItem }>("/stock", input);
}

export function checkoutStock(stockItemId: string, quantity: number, notes?: string) {
  return post(`/stock/${stockItemId}/checkout`, { quantity, notes });
}

export function returnStock(stockItemId: string, quantity: number, notes?: string) {
  return post(`/stock/${stockItemId}/return`, { quantity, notes });
}

/** Sets the stock line's total quantity to `newQuantity` (a physical count correction). */
export function adjustStock(stockItemId: string, newQuantity: number, notes?: string) {
  return post(`/stock/${stockItemId}/adjust`, { quantity: newQuantity, notes });
}

export interface CreatePurchaseOrderInput {
  purchaseOrderNumber: string;
  vendorId: string;
  orderDate: string;
  notes?: string;
  lines: { catalogItemId: string; quantity: number; unitPrice: number }[];
}

export function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  return post<PurchaseOrder>("/purchase-orders", input);
}

export function receivePurchaseOrder(
  purchaseOrderId: string,
  locationId: string,
  lines: { lineId: string; quantity: number }[]
) {
  return post(`/purchase-orders/${purchaseOrderId}/receive`, { locationId, lines });
}

export function cancelPurchaseOrder(purchaseOrderId: string) {
  return post<PurchaseOrder>(`/purchase-orders/${purchaseOrderId}/cancel`);
}
