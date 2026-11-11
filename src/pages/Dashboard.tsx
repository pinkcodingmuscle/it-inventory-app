import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  XAxis, YAxis, BarChart, Bar,
} from "recharts";
import { Boxes, Package, CheckCircle2, AlertTriangle, XCircle, TrendingUp, FileText, Plus, ShoppingCart } from "lucide-react";
import { DataState } from "../components/DataState";
import { usePermissions } from "../context/authValue";
import { useData } from "../context/useData";
import { downloadStockOnHand } from "../lib/reports";
import {
  getDashboardStats,
  getInventoryStatusBreakdown,
  getLowStockTable,
  getRecentPurchases,
  getStockByCategory,
  getTopLocations,
  type DonutEntry,
} from "../lib/selectors";

const quickActions = [
  { label: "Add Inventory Item", icon: Package,      color: "bg-purple-50 text-purple-600", to: "/inventory?new=1" },
  { label: "New Purchase Order", icon: ShoppingCart, color: "bg-blue-50 text-blue-600",     to: "/purchases?new=1" },
  { label: "Generate Report",    icon: FileText,     color: "bg-amber-50 text-amber-600",   to: "/reports"         },
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
  useData();
  const navigate = useNavigate();
  const { canManage } = usePermissions();
  const actions = quickActions.filter((a) => canManage || !a.to.includes("new=1"));
  const stats = getDashboardStats();
  const categoryData = getStockByCategory();
  const inventoryStatusData = getInventoryStatusBreakdown();
  const topLocations = getTopLocations(5);
  const recentPurchases = getRecentPurchases(5);
  const lowStock = getLowStockTable(5);

  const inventoryItemCount = inventoryStatusData.reduce((sum, d) => sum + d.value, 0);

  const statCards = [
    { label: "Item Types",      value: String(stats.itemTypes),      sub: "In the catalog",          subColor: "text-gray-500",  icon: Boxes,        iconBg: "bg-blue-50 text-blue-600"     },
    { label: "Total Units",     value: String(stats.totalUnits),     sub: "Across all locations",    subColor: "text-gray-500",  icon: Package,      iconBg: "bg-purple-50 text-purple-600" },
    { label: "Available Units", value: String(stats.availableUnits), sub: `${stats.totalUnits ? Math.round((stats.availableUnits / stats.totalUnits) * 100) : 0}% of total units`, subColor: "text-gray-500", icon: CheckCircle2, iconBg: "bg-green-50 text-green-600" },
    { label: "Low Stock",       value: String(stats.lowStock),       sub: "At or below reorder point", subColor: "text-amber-600", icon: AlertTriangle, iconBg: "bg-amber-50 text-amber-600" },
    { label: "Out of Stock",    value: String(stats.outOfStock),     sub: "Requires reorder",        subColor: "text-red-600",   icon: XCircle,      iconBg: "bg-red-50 text-red-600"       },
  ];

  return (
    <DataState>
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      {/* Header with action buttons */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-gray-500">Overview of your IT inventory, stock levels, and purchasing.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => downloadStockOnHand()}
            title="Download a stock-on-hand spreadsheet (CSV)"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <FileText size={15} /> Export Report
          </button>
          {canManage && (
            <button
              onClick={() => navigate("/inventory?new=1")}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={15} /> Add New
            </button>
          )}
        </div>
      </div>

      {/* Stat cards + Total Inventory Value */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
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
          <p className="text-2xl font-bold text-gray-900">{stats.totalInventoryValueLabel}</p>
          <p className="text-[11px] text-gray-500">Total Inventory Value</p>
        </div>
      </div>

      {/* Donut charts + Top Locations + Recent Purchases */}
      <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-900">Units by Category</p>
          <DonutChart data={categoryData} total={stats.totalUnits} label="Units" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-900">Inventory Status</p>
          <DonutChart data={inventoryStatusData} total={inventoryItemCount} label="Items" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-gray-900">Top Locations by Units</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topLocations} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="units" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Recent Purchases</p>
            <button onClick={() => navigate("/purchases")} className="text-xs text-blue-600 hover:underline">View all</button>
          </div>
          <div className="space-y-3.5">
            {recentPurchases.length === 0 && (
              <p className="text-xs text-gray-400">No purchase orders yet.</p>
            )}
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

      {/* Low stock table + Quick Actions */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white xl:col-span-3">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <p className="text-sm font-semibold text-gray-900">Items Needing Reorder</p>
            <button onClick={() => navigate("/inventory?status=reorder")} className="text-xs text-blue-600 hover:underline">View all</button>
          </div>
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Item</th>
                <th className="px-5 py-3 text-left">Category</th>
                <th className="px-5 py-3 text-left">Location</th>
                <th className="px-5 py-3 text-left">On Hand</th>
                <th className="px-5 py-3 text-left">Reorder Point</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lowStock.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-5 py-3 text-gray-600">{item.category}</td>
                  <td className="px-5 py-3 text-gray-600">{item.location}</td>
                  <td className={`px-5 py-3 font-medium ${item.status === "out" ? "text-red-600" : "text-gray-700"}`}>{item.quantity}</td>
                  <td className="px-5 py-3 text-gray-600">{item.reorderPoint}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      item.status === "out" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>{item.statusLabel}</span>
                  </td>
                </tr>
              ))}
              {lowStock.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">All items are above their reorder point.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-gray-900">Quick Actions</p>
          <div className="space-y-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} onClick={() => navigate(action.to)} className="flex w-full items-center gap-3 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50">
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
