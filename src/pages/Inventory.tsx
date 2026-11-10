import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { DataState } from "../components/DataState";
import { AddStockModal, StockActionModal, type StockAction } from "../components/StockForms";
import { useData } from "../context/useData";
import type { StockStatus } from "../lib/inventory";
import { getInventoryStats, listStockItems, type StockRow } from "../lib/selectors";
import { useLinkParams } from "../lib/useLinkParams";

const statusStyles: Record<StockStatus, string> = {
  ok:  "bg-green-100 text-green-700",
  low: "bg-amber-100 text-amber-700",
  out: "bg-red-100 text-red-700",
};

const statusFilters = { all: "All statuses", reorder: "Needs reorder", ok: "In stock" } as const;
type StatusFilter = keyof typeof statusFilters;

export function Inventory() {
  const { revision } = useData();
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus]     = useState<StatusFilter>("all");
  const [adding, setAdding]     = useState(false);
  const [action, setAction]     = useState<{ row: StockRow; kind: StockAction } | null>(null);

  // Links from the Dashboard, bell, and header search: ?new=1, ?q=..., ?status=reorder
  useLinkParams((params) => {
    if (params.has("q")) { setSearch(params.get("q") ?? ""); setCategory("All"); setStatus("all"); }
    if (params.has("status")) setStatus(params.get("status") === "reorder" ? "reorder" : "all");
    if (params.get("new") === "1") setAdding(true);
  });

  const inventoryData = useMemo(() => listStockItems(), [revision]);
  const stats = useMemo(() => getInventoryStats(), [revision]);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(inventoryData.map((i) => i.category))).sort()],
    [inventoryData]
  );

  const term = search.trim().toLowerCase();
  const filtered = inventoryData
    .filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.location.toLowerCase().includes(term);
      const matchesCat    = category === "All" || item.category === category;
      const matchesStatus = status === "all" || (status === "reorder" ? item.status !== "ok" : item.status === "ok");
      return matchesSearch && matchesCat && matchesStatus;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const actionButton = "rounded-md px-2 py-1 text-xs font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <>
    <DataState>
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Overview of all stockable IT items and availability.</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">{stats.totalQty}</p>
          <p className="mt-1 text-sm text-gray-500">Total Units</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-green-600">{stats.totalAvailable}</p>
          <p className="mt-1 text-sm text-gray-500">Available</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
          <p className="mt-1 text-sm text-gray-500">Out of Stock</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category"
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none"
        >
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          aria-label="Status"
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none"
        >
          {Object.entries(statusFilters).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button
          onClick={() => setAdding(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3 text-left">Item</th>
              <th className="px-5 py-3 text-left">Category</th>
              <th className="px-5 py-3 text-left">Total Qty</th>
              <th className="px-5 py-3 text-left">Available</th>
              <th className="px-5 py-3 text-left">In Use</th>
              <th className="px-5 py-3 text-left">Location</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-5 py-4 text-gray-600">{item.category}</td>
                <td className="px-5 py-4 font-semibold text-gray-900">{item.quantity}</td>
                <td className="px-5 py-4 font-medium text-green-600">{item.available}</td>
                <td className="px-5 py-4 text-gray-600">{item.inUse}</td>
                <td className="px-5 py-4 text-gray-600">{item.location}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[item.status]}`}>
                    {item.statusLabel}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <button
                    onClick={() => setAction({ row: item, kind: "checkout" })}
                    disabled={item.available === 0}
                    title={item.available === 0 ? "Nothing available to check out" : undefined}
                    className={`${actionButton} text-blue-600`}
                  >
                    Check out
                  </button>
                  <button
                    onClick={() => setAction({ row: item, kind: "return" })}
                    disabled={item.inUse === 0}
                    title={item.inUse === 0 ? "Nothing is checked out" : undefined}
                    className={`${actionButton} text-gray-600`}
                  >
                    Return
                  </button>
                  <button onClick={() => setAction({ row: item, kind: "adjust" })} className={`${actionButton} text-gray-600`}>
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">No items match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
    </DataState>
    {adding && <AddStockModal onClose={() => setAdding(false)} />}
    {action && <StockActionModal row={action.row} action={action.kind} onClose={() => setAction(null)} />}
    </>
  );
}
