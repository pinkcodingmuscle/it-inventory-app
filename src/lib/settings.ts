import { useSyncExternalStore } from "react";

// Organisation-wide preferences, stored on the server (GET/PUT /api/settings)
// so every user and device sees the same values. DataContext loads them with
// the rest of the data; this module keeps the current copy for plain
// functions (selectors, formatting) and lets components subscribe to changes.
export interface AppSettings {
  organizationName: string;
  defaultLocationId: string;
  currency: "USD" | "CAD" | "EUR";
  lowStockAlerts: boolean;
  /** Reorder point used for items that don't set their own. 0 = only flag items that are out. */
  lowStockThreshold: number;
  /** Categories added by hand, offered when creating catalog items even before any item uses them. */
  extraCategories: string[];
  supportEmail: string;
}

export const defaultSettings: AppSettings = {
  organizationName: "Kayaku Advanced Materials",
  defaultLocationId: "",
  currency: "USD",
  lowStockAlerts: true,
  lowStockThreshold: 0,
  extraCategories: [],
  supportEmail: "",
};

let current: AppSettings = defaultSettings;
const listeners = new Set<() => void>();

export function loadSettings(): AppSettings {
  return current;
}

/** Replaces the in-memory copy (after loading from or saving to the server). */
export function setCurrentSettings(next: AppSettings) {
  current = { ...defaultSettings, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current settings, re-rendering when they change. */
export function useSettings(): AppSettings {
  return useSyncExternalStore(subscribe, loadSettings);
}

// Before settings moved to the server they lived in each browser's
// localStorage under this key. DataContext offers that copy to the server
// once, the first time an admin or manager loads the app.
const LEGACY_KEY = "it-inventory:settings";

export function takeLegacyLocalSettings(): AppSettings | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    localStorage.removeItem(LEGACY_KEY);
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}
