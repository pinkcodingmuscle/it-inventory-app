import { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { Monitor, Users, Package, Clock, AlertTriangle, TrendingUp, FileText, Plus, Eye, Upload } from "lucide-react";
import { DataState } from "../components/DataState";
import { useData } from "../context/useData";
import {
  getAssetsByCategory,
  getDashboardStats,
  getEolAssetsTable,
  getEolBuckets,
  getInventoryStatusBreakdown,
  getLifecycleAgeBreakdown,
  getLifecycleTimeline,
  getRecentPurchases,
  getTopLocations,
  type DonutEntry,
} from "../lib/selectors";

const quickActions = [
  { label: "Add New Asset",      icon: Plus,     color: "bg-blue-50 text-blue-600"     },
  { label: "Add Inventory Item", icon: Package,  color: "bg-purple-50 text-purple-600" },
  { label: "Import Assets",      icon: Upload,   color: "bg-green-50 text-green-600"   },
  { label: "Generate Report",    icon: FileText, color: "bg-amber-50 text-amber-600"   },
];

function DonutChart({ data, total, label }: { data: DonutEntry[]; total: number; label: string }) {
  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={78} dataKey="value" paddingAngle={2}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={(v) => [v, ""]} contentStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{total}</span>
          <span className="text-[11px] text-gray-500">{label}</span>
        </div>
      </div>
      <div className="mt-2 space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-gray-600">{d.name}</span>
            </div>
            <span className="font-medium text-gray-800">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { revision } = useData();
  const stats = useMemo(() => getDashboardStats(), [revision]);
  const categoryData = useMemo(() => getAssetsByCategory(), [revision]);
  const inventoryStatusData = useMemo(() => getInventoryStatusBreakdown(), [revision]);
  const lifecycleSummaryData = useMemo(() => getLifecycleAgeBreakdown(), [revision]);
  const eolBuckets = useMemo(() => getEolBuckets(), [revision]);
  const timelineData = useMemo(() => getLifecycleTimeline(), [revision]);
  const topLocations = useMemo(() => getTopLocations(5), [revision]);
  const recentPurchases = useMemo(() => getRecentPurchases(5), [revision]);
  const eolAssets = useMemo(() => getEolAssetsTable(new Date(), 5), [revision]);

  const inventoryItemCount = inventoryStatusData.reduce((sum, d) => sum + d.value, 0);

  const statCards = [
    { label: "Total Assets",     value: String(stats.totalAssets), sub: "Across all locations", subColor: "text-gray-500", icon: Monitor,       iconBg: "bg-blue-50 text-blue-600"     },
    { label: "Assigned Assets",  value: String(stats.assignedAssets), sub: `${stats.totalAssets ? Math.round((stats.assignedAssets / stats.totalAssets) * 100) : 0}% of total assets`, subColor: "text-gray-500", icon: Users, iconBg: "bg-purple-50 text-purple-600" },
    { label: "Available Assets", value: String(stats.availableAssets), sub: `${stats.totalAssets ? Math.round((stats.availableAssets / stats.totalAssets) * 100) : 0}% of total assets`, subColor: "text-gray-500", icon: Package, iconBg: "bg-green-50 text-green-600"   },
    { label: "Assets Near EOL",  value: String(stats.assetsNearEol), sub: "Within 90 days",       subColor: "text-amber-600", icon: Clock,       iconBg: "bg-amber-50 text-amber-600"   },
    { label: "Assets Past EOL",  value: String(stats.assetsPastEol), sub: "Requires immediate action", subColor: "text-red-600", icon: AlertTriangle, iconBg: "bg-red-50 text-red-600" },
  ];

  return (
    <DataState>
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header with action buttons */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-gray-500">Overview of your IT assets, inventory, and lifecycle.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            <FileText size={15} /> Export Report
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={15} /> Add New
          </button>
        </div>
      </div>

      {/* Stat cards + Total Asset Value */}
      <div className="mb-5 grid grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                <Icon size={16} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-[11px] text-gray-500">{card.label}</p>
              <p className={`mt-1.5 text-[11px] ${card.subColor}`}>{card.sub}</p>
            </div>
          );
        })}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <TrendingUp size={16} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalAssetValueLabel}</p>
          <p className="text-[11px] text-gray-500">Total Asset Value</p>
        </div>
      </div>

      {/* Three donut charts + EOL time bucket table */}
      <div className="mb-5 grid grid-cols-4 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-900">Assets by Category</p>
          <DonutChart data={categoryData} total={stats.totalAssets} label="Total" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-900">Inventory Status</p>
          <DonutChart data={inventoryStatusData} total={inventoryItemCount} label="Items" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-900">Lifecycle Summary</p>
          <DonutChart data={lifecycleSummaryData} total={stats.totalAssets} label="Total" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Assets Near / Past EOL</p>
            <button className="text-xs text-blue-600 hover:underline">View all</button>
          </div>
          <div className="mb-3 flex justify-between text-xs font-medium text-gray-400">
            <span>Time Remaining</span><span>Count</span>
          </div>
          <div className="space-y-3">
            {eolBuckets.map((b) => (
              <div key={b.bucket} className="flex items-center justify-between">
                <span className={`text-xs font-medium ${b.color}`}>{b.label}</span>
                <span className="text-sm font-semibold text-gray-900">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lifecycle timeline + Top Locations bar + Recent Purchases */}
      <div className="mb-5 grid grid-cols-4 gap-5">
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-gray-900">Lifecycle Timeline (All Assets)</p>
          <ResponsiveContainer width="100%" height={155}>
            <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: "#6366f1" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-gray-900">Top Locations by Assets</p>
          <ResponsiveContainer width="100%" height={155}>
            <BarChart data={topLocations} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="assets" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Recent Purchases</p>
            <button className="text-xs text-blue-600 hover:underline">View all</button>
          </div>
          <div className="space-y-3.5">
            {recentPurchases.map((p, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-800">{p.item}</p>
                  <p className="text-xs text-gray-500">{p.vendor} · {p.date}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-gray-900">{p.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EOL Assets table + Quick Actions */}
      <div className="grid grid-cols-4 gap-5">
        <div className="col-span-3 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <p className="text-sm font-semibold text-gray-900">Assets Reaching End of Life</p>
            <button className="text-xs text-blue-600 hover:underline">View all</button>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Tag</th>
                <th className="px-5 py-3 text-left">Asset Name</th>
                <th className="px-5 py-3 text-left">Category</th>
                <th className="px-5 py-3 text-left">Assigned To</th>
                <th className="px-5 py-3 text-left">EOL Date</th>
                <th className="px-5 py-3 text-left">Remaining</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {eolAssets.map((asset) => (
                <tr key={asset.tag} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs font-medium text-blue-600">{asset.tag}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{asset.name}</td>
                  <td className="px-5 py-3 text-gray-600">{asset.category}</td>
                  <td className="px-5 py-3 text-gray-600">{asset.assignedTo}</td>
                  <td className="px-5 py-3 text-gray-600">{asset.dueDate}</td>
                  <td className={`px-5 py-3 font-medium ${asset.bucket === "past_eol" ? "text-red-600" : "text-gray-700"}`}>{asset.remaining}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      asset.bucket === "past_eol" ? "bg-red-100 text-red-700" :
                      asset.bucket === "0_30" ? "bg-orange-100 text-orange-700" :
                      asset.bucket === "31_60" ? "bg-amber-100 text-amber-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>{asset.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <button className="text-gray-400 hover:text-gray-700"><Eye size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-gray-900">Quick Actions</p>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} className="flex w-full items-center gap-3 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
                    <Icon size={16} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </DataState>
  );
}
