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
    throw new Error(body.error ?? `Request to ${path} failed with status ${res.status}`);
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
