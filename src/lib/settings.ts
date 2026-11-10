import { useEffect, useState } from "react";

// App preferences. There is no settings table on the server yet, so these are
// kept in this browser's localStorage: they persist across reloads on one
// machine but are not shared between users or devices.
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

const KEY = "it-inventory:settings";
const EVENT = "it-inventory:settings-changed";

export const defaultSettings: AppSettings = {
  organizationName: "Kayaku Advanced Materials",
  defaultLocationId: "",
  currency: "USD",
  lowStockAlerts: true,
  lowStockThreshold: 0,
  extraCategories: [],
  supportEmail: "",
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(next: AppSettings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

/** Current settings, re-rendering when they are saved anywhere in the app. */
export function useSettings(): AppSettings {
  const [settings, setSettings] = useState(loadSettings);
  useEffect(() => {
    const update = () => setSettings(loadSettings());
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return settings;
}
