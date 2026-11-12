import { useState } from "react";
import { AlertTriangle, History, Pencil, Plus, Search } from "lucide-react";
import { DataState } from "../components/DataState";
import { AddStockModal, EditStockModal, StockActionModal, StockHistoryModal, type StockAction } from "../components/StockForms";
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

// Consumables (toner, cables, batteries) used to have their own page; it's now this filter.
const typeFilters = { all: "All types", consumable: "Consumables", accessory: "Accessories" } as const;
type TypeFilter = keyof typeof typeFilters;

type Dialog =
  | { kind: StockAction; row: StockRow }
  | { kind: "edit"; row: StockRow }
  | { kind: "history"; row: StockRow }
  | { kind: "add" };

const selectClass = "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none";

export function Inventory() {
  useData();
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus]     = useState<StatusFilter>("all");
  const [type, setType]         = useState<TypeFilter>("all");
  const [dialog, setDialog]     = useState<Dialog | null>(null);

  // Links from the Dashboard, bell, header search and old Consumables link:
  // ?new=1, ?q=..., ?status=reorder, ?type=consumable
  useLinkParams((params) => {
    if (params.has("q")) { setSearch(params.get("q") ?? ""); setCategory("All"); setStatus("all"); setType("all"); }
    if (params.has("status")) setStatus(params.get("status") === "reorder" ? "reorder" : "all");
    if (params.has("type")) {
      const t = params.get("type");
      setType(t === "consumable" || t === "accessory" ? t : "all");
    }
    if (params.get("new") === "1") setDialog({ kind: "add" });
  });

  const inventoryData = listStockItems();
  const stats = getInventoryStats();
  const categories = ["All", ...Array.from(new Set(inventoryData.map((i) => i.category))).sort()];

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
      const matchesType   = type === "all" || item.type === type;
      return matchesSearch && matchesCat && matchesStatus && matchesType;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const actionButton = "rounded-md px-2 py-1 text-xs font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40";
  const iconButton = "rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700";

  return (
    <>
    <DataState>
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <div className="mb-6 sm:mb-8">
        <p className="text-gray-500">Overview of all stockable IT items and availability.</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <p className="text-2xl font-bold text-gray-900 sm:text-3xl">{stats.totalQty}</p>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Total Units</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <p className="text-2xl font-bold text-green-600 sm:text-3xl">{stats.totalAvailable}</p>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Available</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <p className="text-2xl font-bold text-red-600 sm:text-3xl">{stats.outOfStock}</p>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Out of Stock</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex h-10 min-w-[12rem] flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            aria-label="Search inventory"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value as TypeFilter)} aria-label="Type" className={selectClass}>
          {Object.entries(typeFilters).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={selectClass}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Status" className={selectClass}>
          {Object.entries(statusFilters).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button
          onClick={() => setDialog({ kind: "add" })}
          className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Total Qty</th>
              <th className="px-4 py-3 text-left">Available</th>
              <th className="px-4 py-3 text-left">In Use</th>
              <th className="px-4 py-3 text-left">Reorder At</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="min-w-[14rem] px-4 py-3 font-medium text-gray-900">
                  <span className="flex items-center gap-2">
                    {item.status !== "ok" && (
                      <AlertTriangle size={14} aria-hidden="true" className={item.status === "out" ? "text-red-500" : "text-amber-500"} />
                    )}
                    {item.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.category}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{item.quantity}</td>
                <td className="px-4 py-3 font-medium text-green-600">{item.available}</td>
                <td className="px-4 py-3 text-gray-600">{item.inUse}</td>
                <td className="px-4 py-3 text-gray-500">{item.reorderPoint}</td>
                <td className="px-4 py-3 text-gray-600">{item.location}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[item.status]}`}>
                    {item.statusLabel}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <>
                    <button
                      onClick={() => setDialog({ kind: "checkout", row: item })}
                      disabled={item.available === 0}
                      title={item.available === 0 ? "Nothing available to check out" : undefined}
                      className={`${actionButton} text-blue-600`}
                    >
                      Check out
                    </button>
                    <button
                      onClick={() => setDialog({ kind: "return", row: item })}
                      disabled={item.inUse === 0}
                      title={item.inUse === 0 ? "Nothing is checked out" : undefined}
                      className={`${actionButton} text-gray-600`}
                    >
                      Return
                    </button>
                  </>
                  <button onClick={() => setDialog({ kind: "adjust", row: item })} className={`${actionButton} text-gray-600`}>
                    Adjust
                  </button>
                  <button onClick={() => setDialog({ kind: "history", row: item })} aria-label={`History of ${item.name}`} title="History" className={iconButton}>
                    <History size={15} />
                  </button>
                  <button onClick={() => setDialog({ kind: "edit", row: item })} aria-label={`Edit ${item.name}`} title="Edit" className={iconButton}>
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400">No items match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
    </DataState>
    {dialog?.kind === "add" && <AddStockModal onClose={() => setDialog(null)} />}
    {dialog?.kind === "edit" && <EditStockModal row={dialog.row} onClose={() => setDialog(null)} />}
    {dialog?.kind === "history" && <StockHistoryModal row={dialog.row} onClose={() => setDialog(null)} />}
    {(dialog?.kind === "checkout" || dialog?.kind === "return" || dialog?.kind === "adjust") && (
      <StockActionModal row={dialog.row} action={dialog.kind} onClose={() => setDialog(null)} />
    )}
    </>
  );
}
