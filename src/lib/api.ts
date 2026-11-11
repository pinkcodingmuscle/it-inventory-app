import type {
  Actor,
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

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

// ---------------------------------------------------------------------------
// Session token
// ---------------------------------------------------------------------------

const TOKEN_KEY = "it-inventory:session";
/** Fired when the API rejects the session (expired, signed out elsewhere, user deactivated). */
export const SIGNED_OUT_EVENT = "it-inventory:signed-out";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked: the session lasts until the tab is reloaded.
  }
  memoryToken = token;
}

let memoryToken: string | null = getToken();

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = memoryToken;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && token && !path.startsWith("/auth/login")) {
      setToken(null);
      window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
    }
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
// Auth
// ---------------------------------------------------------------------------

export async function login(email: string, password: string): Promise<Actor> {
  const res = await post<{ token: string; user: Actor }>("/auth/login", { email, password });
  setToken(res.token);
  return res.user;
}

/** Requests an account. It can't sign in until an administrator approves it. */
export async function signup(name: string, email: string, password: string): Promise<void> {
  await post("/auth/signup", { name, email, password });
}

export async function fetchCurrentUser(): Promise<Actor> {
  return (await apiFetch<{ user: Actor }>("/auth/me")).user;
}

export async function logout() {
  try {
    await post("/auth/logout");
  } finally {
    setToken(null);
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await post<{ token: string }>("/auth/change-password", { currentPassword, newPassword });
  setToken(res.token);
}

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

// ---------------------------------------------------------------------------
// Users (administrators only)
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  name: string;
  email: string;
  role: string;
  password?: string;
}

export function createUser(input: CreateUserInput): Promise<User> {
  return post<User>("/users", input);
}

export function updateUser(id: string, input: Partial<{ name: string; email: string; role: string; status: "active" | "inactive" }>) {
  return patch<User>(`/users/${id}`, input);
}

export function setUserPassword(id: string, password: string) {
  return post<User>(`/users/${id}/password`, { password });
}

/** Declines a sign-up request (only pending accounts can be deleted). */
export function deleteUser(id: string) {
  return del(`/users/${id}`);
}
