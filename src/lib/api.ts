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
import type { AppSettings } from "./settings";

// In production the API is served from the same site (Netlify Function at
// /api); in development it's the local Express server.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000/api" : "/api");

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

const send = <T>(method: string, path: string, body?: unknown) =>
  apiFetch<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
const post = <T>(path: string, body?: unknown) => send<T>("POST", path, body);
const patch = <T>(path: string, body: unknown) => send<T>("PATCH", path, body);
const del = (path: string) => send<void>("DELETE", path);

// ---------------------------------------------------------------------------
// Bulk load
// ---------------------------------------------------------------------------

export interface SettingsResponse {
  settings: AppSettings;
  /** False until someone saves settings for the first time. */
  saved: boolean;
}

export async function fetchAppData(): Promise<{ data: AppData; settings: SettingsResponse }> {
  // The transaction history is deliberately not loaded here: it only grows.
  // Reports and the item history fetch the slice they need.
  const [departments, users, locations, vendors, catalogItems, stockItems, purchaseOrderData, settings] = await Promise.all([
    apiFetch<Department[]>("/departments"),
    apiFetch<User[]>("/users"),
    apiFetch<Location[]>("/locations"),
    apiFetch<Vendor[]>("/vendors"),
    apiFetch<CatalogItem[]>("/catalog-items"),
    apiFetch<StockItem[]>("/stock"),
    apiFetch<{ purchaseOrders: PurchaseOrder[]; purchaseOrderLines: PurchaseOrderLine[] }>("/purchase-orders"),
    apiFetch<SettingsResponse>("/settings"),
  ]);

  return {
    data: {
      departments: byId(departments),
      users: byId(users),
      locations: byId(locations),
      vendors: byId(vendors),
      catalogItems: byId(catalogItems),
      stockItems: byId(stockItems),
      purchaseOrders: byId(purchaseOrderData.purchaseOrders),
      purchaseOrderLines: byId(purchaseOrderData.purchaseOrderLines),
    },
    settings,
  };
}

export function saveSettingsToServer(settings: AppSettings) {
  return send<SettingsResponse>("PUT", "/settings", settings);
}

export interface TransactionQuery {
  catalogItemId?: string;
  locationId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

/** Inventory transactions, newest first. */
export function fetchTransactions(query: TransactionQuery = {}): Promise<InventoryTransaction[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value));
  const qs = params.toString();
  return apiFetch<InventoryTransaction[]>(`/inventory-transactions${qs ? `?${qs}` : ""}`);
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export interface CreateLocationInput {
  name: string;
  type: Location["type"];
  managerUserId?: string;
  notes?: string;
}

export function createLocation(input: CreateLocationInput): Promise<Location> {
  return post<Location>("/locations", input);
}

export type UpdateLocationInput = Partial<{ name: string; type: Location["type"]; managerUserId: string | null; notes: string | null }>;

export function updateLocation(id: string, input: UpdateLocationInput): Promise<Location> {
  return patch<Location>(`/locations/${id}`, input);
}

export function deleteLocation(id: string): Promise<void> {
  return del(`/locations/${id}`);
}

// ---------------------------------------------------------------------------
// Vendors and catalog items
// ---------------------------------------------------------------------------

export type CreateVendorInput = Omit<Vendor, "id">;

export function createVendor(input: CreateVendorInput): Promise<Vendor> {
  return post<Vendor>("/vendors", input);
}

/** null clears an optional field. */
export type UpdateVendorInput = Partial<{
  name: string;
  category: Vendor["category"];
  contactName: string | null;
  email: string | null;
  phone: string | null;
}>;

export function updateVendor(id: string, input: UpdateVendorInput): Promise<Vendor> {
  return patch<Vendor>(`/vendors/${id}`, input);
}

export function deleteVendor(id: string): Promise<void> {
  return del(`/vendors/${id}`);
}

export type CreateCatalogItemInput = Omit<CatalogItem, "id">;

export function createCatalogItem(input: CreateCatalogItemInput): Promise<CatalogItem> {
  return post<CatalogItem>("/catalog-items", input);
}

/** null clears an optional field. */
export type UpdateCatalogItemInput = Partial<{
  name: string;
  category: string;
  type: CatalogItem["type"];
  manufacturer: string | null;
  model: string | null;
  vendorId: string | null;
  reorderPoint: number | null;
  unitPrice: number | null;
}>;

export function updateCatalogItem(id: string, input: UpdateCatalogItemInput): Promise<CatalogItem> {
  return patch<CatalogItem>(`/catalog-items/${id}`, input);
}

export function deleteCatalogItem(id: string): Promise<void> {
  return del(`/catalog-items/${id}`);
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

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

/** Sets this stock line's own reorder point; null falls back to the catalog item's or the default. */
export function updateStockItem(id: string, input: { reorderPoint: number | null }) {
  return patch<StockItem>(`/stock/${id}`, input);
}

/** Stops tracking an item at a location (only once its quantity is 0). */
export function deleteStockItem(id: string) {
  return del(`/stock/${id}`);
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

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------

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
