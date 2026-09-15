import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DataState } from "../components/DataState";
import { useData } from "../context/useData";
import { getPurchaseStats, listPurchaseOrders } from "../lib/selectors";
import type { PurchaseOrderStatus } from "../types/domain";

const statusStyles: Record<PurchaseOrderStatus, string> = {
  open:      "bg-blue-100 text-blue-700",
  received:  "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const filters = ["All", "open", "received", "cancelled"] as const;
type Filter = typeof filters[number];
const filterLabels: Record<Filter, string> = {
  All: "All",
  open: "Open",
  received: "Received",
  cancelled: "Cancelled",
};

export function Purchases() {
  const { revision } = useData();
  const [search, setSearch]             = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const purchaseData = useMemo(() => listPurchaseOrders(), [revision]);
  const stats = useMemo(() => getPurchaseStats(), [revision]);

  const filtered = purchaseData.filter((p) => {
    const matchesSearch = p.poNumber.toLowerCase().includes(search.toLowerCase()) ||
                          p.vendor.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "All" || p.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <DataState>
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Track purchase orders and procurement history.</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-blue-600">{stats.openCount}</p>
          <p className="mt-1 text-sm text-gray-500">Open POs</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-green-600">{stats.receivedCount}</p>
          <p className="mt-1 text-sm text-gray-500">Received</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">{stats.totalSpendLabel}</p>
          <p className="mt-1 text-sm text-gray-500">Total Spend (2024)</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by PO number or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === f ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left">PO Number</th>
              <th className="px-6 py-3 text-left">Vendor</th>
              <th className="px-6 py-3 text-left">Items</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Total</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-xs font-medium text-gray-900">{p.poNumber}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{p.vendor}</td>
                <td className="px-6 py-4 text-gray-600">{p.items}</td>
                <td className="px-6 py-4 text-gray-600">{p.date}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{p.totalLabel}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[p.status]}`}>
                    {p.statusLabel}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">No purchase orders match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
    </DataState>
  );
}
