import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, Bell, CircleHelp, Package, Building2, ShoppingCart, MapPin, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "../context/useData";
import { listLocations, listPurchaseOrders, listStockItems, listVendors } from "../lib/selectors";
import { useSettings } from "../lib/settings";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/inventory": "Inventory",
  "/purchases": "Purchases",
  "/vendors": "Vendors",
  "/locations": "Locations",
  "/reports": "Reports",
  "/settings": "Settings",
};

type Panel = "search" | "alerts" | "help" | null;

interface SearchHit {
  key: string;
  label: string;
  sub: string;
  icon: typeof Package;
  to: string;
}

const MAX_PER_GROUP = 4;

/** A dropdown anchored under its trigger. */
function Popover({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`absolute right-0 top-full z-40 mt-2 rounded-xl border border-gray-200 bg-white shadow-lg ${className}`}>
      {children}
    </div>
  );
}

export default function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Subscribing re-renders the header (alerts, search results) after every data refresh.
  useData();
  const settings = useSettings();
  const title = pageTitles[location.pathname] ?? "IT Inventory";

  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Close any open panel on outside click, Escape, or navigation.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPanel(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const [panelPath, setPanelPath] = useState(location.pathname);
  if (panelPath !== location.pathname) {
    setPanelPath(location.pathname);
    setPanel(null);
  }

  const alerts = listStockItems().filter((r) => r.status !== "ok").sort((a, b) => a.quantity - b.quantity);
  const alertCount = settings.lowStockAlerts ? alerts.length : 0;

  const hits: SearchHit[] = (() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    const has = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(term));
    const q = encodeURIComponent(query.trim());
    return [
      ...listStockItems()
        .filter((r) => has(r.name, r.category))
        .slice(0, MAX_PER_GROUP)
        .map((r) => ({ key: `s-${r.id}`, label: r.name, sub: `${r.location} · ${r.quantity} units`, icon: Package, to: `/inventory?q=${encodeURIComponent(r.name)}` })),
      ...listVendors()
        .filter((v) => has(v.name, v.categoryLabel, v.contact))
        .slice(0, MAX_PER_GROUP)
        .map((v) => ({ key: `v-${v.id}`, label: v.name, sub: `Vendor · ${v.categoryLabel}`, icon: Building2, to: "/vendors" })),
      ...listPurchaseOrders()
        .filter((p) => has(p.poNumber, p.vendor, p.items))
        .slice(0, MAX_PER_GROUP)
        .map((p) => ({ key: `p-${p.id}`, label: p.poNumber, sub: `${p.vendor} · ${p.statusLabel}`, icon: ShoppingCart, to: `/purchases?q=${encodeURIComponent(p.poNumber)}` })),
      ...listLocations()
        .filter((l) => has(l.name))
        .slice(0, MAX_PER_GROUP)
        .map((l) => ({ key: `l-${l.id}`, label: l.name, sub: `Location · ${l.totalUnits} units`, icon: MapPin, to: "/locations" })),
    ].concat(
      // Always offer the full inventory search as a final option.
      [{ key: "all", label: `Search inventory for “${query.trim()}”`, sub: "Show all matching items", icon: Search, to: `/inventory?q=${q}` }]
    );
  })();

  function go(to: string) {
    setPanel(null);
    setQuery("");
    navigate(to);
  }

  const iconButton = "relative rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900";

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b bg-white px-4 sm:h-20 sm:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button onClick={onOpenMenu} aria-label="Open menu" className={`${iconButton} lg:hidden`}>
          <Menu size={21} />
        </button>
        <h1 className="hidden truncate text-xl font-semibold text-slate-900 sm:block lg:text-2xl">{title}</h1>
      </div>

      <div ref={rootRef} className="flex min-w-0 items-center gap-2 sm:gap-4">
        {/* Search */}
        <div className="relative min-w-0">
          <div className="flex h-10 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-400 sm:w-64 sm:px-4 xl:w-96">
            <Search size={18} className="text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPanel("search"); }}
              onFocus={() => query && setPanel("search")}
              onKeyDown={(e) => {
                // Enter shows every matching inventory item; if only a vendor/PO/location matches, open that instead.
                if (e.key !== "Enter" || !query.trim()) return;
                const onlyOther = hits.length > 1 && !hits.some((h) => h.key.startsWith("s-"));
                go(onlyOther ? hits[0].to : `/inventory?q=${encodeURIComponent(query.trim())}`);
              }}
              placeholder="Search everything..."
              aria-label="Search everything"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          {panel === "search" && query.trim() && (
            <Popover className="left-0 w-[min(24rem,calc(100vw-2rem))]">
              <ul className="max-h-96 overflow-y-auto py-1">
                {hits.length === 1 && (
                  <li className="px-4 py-2 text-xs text-gray-400">No direct matches.</li>
                )}
                {hits.map((hit) => {
                  const Icon = hit.icon;
                  return (
                    <li key={hit.key}>
                      <button onClick={() => go(hit.to)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50">
                        <Icon size={15} className="shrink-0 text-gray-400" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-gray-800">{hit.label}</span>
                          <span className="block truncate text-xs text-gray-500">{hit.sub}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Popover>
          )}
        </div>

        {/* Low-stock alerts */}
        <div className="relative">
          <button
            onClick={() => setPanel((p) => (p === "alerts" ? null : "alerts"))}
            aria-label={`Alerts${alertCount ? ` (${alertCount})` : ""}`}
            className={iconButton}
          >
            <Bell size={21} />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                {alertCount > 99 ? "99+" : alertCount}
              </span>
            )}
          </button>
          {panel === "alerts" && (
            <Popover className="w-[min(20rem,calc(100vw-2rem))]">
              <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">Low-stock alerts</div>
              {!settings.lowStockAlerts ? (
                <p className="px-4 py-4 text-sm text-gray-500">Alerts are turned off in Settings.</p>
              ) : alerts.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-500">Everything is above its reorder point.</p>
              ) : (
                <ul className="max-h-80 divide-y divide-gray-50 overflow-y-auto">
                  {alerts.slice(0, 8).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-gray-800">{a.name}</span>
                        <span className="block text-xs text-gray-500">{a.location} · {a.quantity} left (reorder at {a.reorderPoint})</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${a.status === "out" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {a.statusLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {settings.lowStockAlerts && alerts.length > 0 && (
                <button
                  onClick={() => go("/inventory?status=reorder")}
                  className="w-full border-t border-gray-100 px-4 py-2.5 text-left text-sm font-medium text-blue-600 hover:bg-gray-50"
                >
                  View all {alerts.length} in Inventory →
                </button>
              )}
            </Popover>
          )}
        </div>

        {/* Help */}
        <div className="relative">
          <button onClick={() => setPanel((p) => (p === "help" ? null : "help"))} aria-label="Help" className={iconButton}>
            <CircleHelp size={21} />
          </button>
          {panel === "help" && (
            <Popover className="w-[min(20rem,calc(100vw-2rem))] p-4 text-sm text-gray-600">
              <p className="mb-2 font-semibold text-gray-900">Quick guide</p>
              <ul className="list-disc space-y-1.5 pl-4">
                <li><strong>Inventory</strong>: add, edit, and remove items; check out, return, or recount stock; see each item's history.</li>
                <li><strong>Purchases</strong>: create orders, then <em>Receive</em> them to add stock.</li>
                <li><strong>Vendors</strong> and <strong>Locations</strong>: manage suppliers and storage places.</li>
                <li><strong>Reports</strong>: download spreadsheets (CSV).</li>
                <li><strong>Settings</strong>: shared preferences (default location, low-stock threshold, support email).</li>
              </ul>
              {settings.supportEmail && (
                <a href={`mailto:${settings.supportEmail}`} className="mt-3 block font-medium text-blue-600 hover:underline">
                  Email support
                </a>
              )}
            </Popover>
          )}
        </div>

      </div>
    </header>
  );
}
