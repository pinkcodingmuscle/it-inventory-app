import { useMemo, useState } from "react";
import { Laptop, Search, Eye } from "lucide-react";
import { DataState } from "../components/DataState";
import { useData } from "../context/useData";
import { getAssetStats, listAssets, type AssetRow } from "../lib/selectors";
import type { AssetStatus } from "../types/domain";

const statusStyles: Record<AssetStatus, string> = {
  active: "bg-green-100 text-green-700",
  in_storage: "bg-blue-100 text-blue-700",
  under_repair: "bg-amber-100 text-amber-700",
  retired: "bg-gray-100 text-gray-600",
};

const filters = ["All", "active", "in_storage", "under_repair", "retired"] as const;
type Filter = typeof filters[number];
const filterLabels: Record<Filter, string> = {
  All: "All",
  active: "Active",
  in_storage: "In Storage",
  under_repair: "Under Repair",
  retired: "Retired",
};

export function Assets() {
  const { revision } = useData();
  const [search, setSearch]             = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const assetData = useMemo(() => listAssets(), [revision]);
  const stats = useMemo(() => getAssetStats(), [revision]);

  const statCards = [
    { label: "Total Assets", value: stats.total },
    { label: "Active",       value: stats.active },
    { label: "In Storage",   value: stats.inStorage },
    { label: "Under Repair", value: stats.underRepair },
  ];

  const filtered = assetData.filter((a: AssetRow) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
                          a.serial.toLowerCase().includes(search.toLowerCase()) ||
                          a.assignedTo.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "All" || a.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <DataState>
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Track all individually serialized IT assets.</p>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-5">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="mt-1 text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, serial, or assignee..."
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
              <th className="px-6 py-3 text-left">Tag</th>
              <th className="px-6 py-3 text-left">Asset</th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Serial</th>
              <th className="px-6 py-3 text-left">Assigned To</th>
              <th className="px-6 py-3 text-left">Location</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-xs font-medium text-blue-600">{asset.tag}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <Laptop size={15} className="shrink-0 text-gray-400" />
                    {asset.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{asset.type}</td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500">{asset.serial}</td>
                <td className="px-6 py-4 text-gray-600">{asset.assignedTo}</td>
                <td className="px-6 py-4 text-gray-600">{asset.location}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[asset.status]}`}>
                    {asset.statusLabel}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-gray-400 hover:text-gray-700"><Eye size={15} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">No assets match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
    </DataState>
  );
}
