import { useMemo, useState } from "react";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { DataState } from "../components/DataState";
import { useData } from "../context/useData";
import { getLifecycleStats, listAssetLifecycle } from "../lib/selectors";
import type { LifecycleBucket } from "../lib/lifecycle";

const filters = ["All", "past_eol", "0_30", "31_60", "61_90", "on_track"] as const;
type Filter = typeof filters[number];
const filterLabels: Record<Filter, string> = {
  All: "All",
  past_eol: "Past EOL",
  "0_30": "0–30 days",
  "31_60": "31–60 days",
  "61_90": "61–90 days",
  on_track: "On Track",
};

const statusStyles: Record<LifecycleBucket, string> = {
  past_eol: "bg-red-100 text-red-700",
  "0_30": "bg-orange-100 text-orange-700",
  "31_60": "bg-amber-100 text-amber-700",
  "61_90": "bg-yellow-100 text-yellow-700",
  "91_180": "bg-gray-100 text-gray-700",
  "181_365": "bg-gray-100 text-gray-700",
  on_track: "bg-green-100 text-green-700",
  no_date: "bg-gray-100 text-gray-500",
};

export default function Lifecycle() {
  const { revision } = useData();
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const assets = useMemo(() => listAssetLifecycle(), [revision]);
  const lifecycleStats = useMemo(() => getLifecycleStats(), [revision]);

  const stats = [
    { label: "Past EOL",           value: lifecycleStats.pastEol,          icon: AlertTriangle, color: "bg-red-50 text-red-600"     },
    { label: "Due in 90 Days",     value: lifecycleStats.dueIn90Days,      icon: Clock,         color: "bg-amber-50 text-amber-600" },
    { label: "Replaced This Year", value: lifecycleStats.replacedThisYear, icon: CheckCircle,   color: "bg-green-50 text-green-600" },
  ];

  const filtered = activeFilter === "All" ? assets : assets.filter((a) => a.bucket === activeFilter);

  return (
    <DataState>
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Track replacement cycles and plan asset refreshes.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-6">
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                <Icon size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Asset table with filter tabs */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Asset Lifecycle Status</h2>

          <div className="flex gap-1 rounded-lg border border-gray-200 p-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeFilter === f
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left">Asset</th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Assigned To</th>
              <th className="px-6 py-3 text-left">Purchase Date</th>
              <th className="px-6 py-3 text-left">Age</th>
              <th className="px-6 py-3 text-left">Due Date</th>
              <th className="px-6 py-3 text-left">Remaining</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{asset.name}</td>
                <td className="px-6 py-4 text-gray-600">{asset.type}</td>
                <td className="px-6 py-4 text-gray-600">{asset.assignedTo}</td>
                <td className="px-6 py-4 text-gray-600">{asset.purchaseDate}</td>
                <td className="px-6 py-4 text-gray-600">{asset.age}</td>
                <td className="px-6 py-4 text-gray-600">{asset.dueDate}</td>
                <td className={`px-6 py-4 font-medium ${asset.bucket === "past_eol" ? "text-red-600" : "text-gray-700"}`}>{asset.remaining}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[asset.bucket]}`}>
                    {asset.bucketLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
    </DataState>
  );
}
