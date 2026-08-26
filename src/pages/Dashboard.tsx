import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { Monitor, Users, Package, Clock, AlertTriangle, TrendingUp, FileText, Plus, Eye, Upload } from "lucide-react";

const statCards = [
  { label: "Total Assets",    value: "247", sub: "↑ 12 (5.1%) from last month", subColor: "text-green-600",  icon: Monitor,       iconBg: "bg-blue-50 text-blue-600"     },
  { label: "Assigned Assets", value: "192", sub: "77.7% of total assets",        subColor: "text-gray-500",   icon: Users,         iconBg: "bg-purple-50 text-purple-600" },
  { label: "Available Assets",value: "55",  sub: "22.3% of total assets",        subColor: "text-gray-500",   icon: Package,       iconBg: "bg-green-50 text-green-600"   },
  { label: "Assets Near EOL", value: "15",  sub: "Within 90 days",               subColor: "text-amber-600",  icon: Clock,         iconBg: "bg-amber-50 text-amber-600"   },
  { label: "Assets Past EOL", value: "8",   sub: "Requires immediate action",    subColor: "text-red-600",    icon: AlertTriangle, iconBg: "bg-red-50 text-red-600"       },
];

const categoryData = [
  { name: "Laptops",     value: 84, color: "#6366f1" },
  { name: "Desktops",    value: 52, color: "#8b5cf6" },
  { name: "Monitors",    value: 37, color: "#06b6d4" },
  { name: "Printers",    value: 25, color: "#10b981" },
  { name: "Accessories", value: 17, color: "#f59e0b" },
  { name: "Networking",  value: 20, color: "#f43f5e" },
  { name: "Other",       value: 12, color: "#94a3b8" },
];

const inventoryStatusData = [
  { name: "In Stock",     value: 107, color: "#10b981" },
  { name: "Low Stock",    value: 18,  color: "#f59e0b" },
  { name: "On Order",     value: 15,  color: "#6366f1" },
  { name: "Out of Stock", value: 7,   color: "#f43f5e" },
];

const lifecycleSummaryData = [
  { name: "0–6 months",  value: 55, color: "#10b981" },
  { name: "6–12 months", value: 40, color: "#06b6d4" },
  { name: "1–2 years",   value: 70, color: "#6366f1" },
  { name: "2–3 years",   value: 45, color: "#8b5cf6" },
  { name: "Past EOL",    value: 23, color: "#f43f5e" },
  { name: "No Date",     value: 14, color: "#94a3b8" },
];

const eolBuckets = [
  { label: "Past EOL",     count: 8,  color: "text-red-600"    },
  { label: "0–30 days",    count: 3,  color: "text-red-500"    },
  { label: "31–60 days",   count: 4,  color: "text-orange-500" },
  { label: "61–90 days",   count: 8,  color: "text-amber-600"  },
  { label: "91–180 days",  count: 15, color: "text-gray-700"   },
  { label: "181–365 days", count: 22, color: "text-gray-700"   },
];

const timelineData = [
  { label: "Past EOL", count: 8  },
  { label: "0–30",     count: 3  },
  { label: "31–60",    count: 4  },
  { label: "61–90",    count: 8  },
  { label: "91–180",   count: 15 },
  { label: "181–365",  count: 22 },
  { label: "1–2 yrs",  count: 84 },
  { label: "2–3 yrs",  count: 70 },
  { label: "No Date",  count: 14 },
];

const topLocations = [
  { name: "IT Storage",  assets: 84 },
  { name: "Employees",   assets: 73 },
  { name: "Main Office", assets: 61 },
  { name: "Help Desk",   assets: 12 },
  { name: "Warehouse",   assets: 7  },
];

const recentPurchases = [
  { item: "Dell Latitude 5530 (10)", vendor: "Dell",  date: "Aug 10", amount: "$18,500" },
  { item: "HP 58A Toner (3)",        vendor: "HP",    date: "Aug 15", amount: "$420"    },
  { item: "USB-C Cables (20)",       vendor: "Cables",date: "Aug 18", amount: "$180"    },
  { item: 'MacBook Pro 14" (2)',      vendor: "Apple", date: "Jul 28", amount: "$5,998"  },
  { item: "Adobe CC (25 seats)",     vendor: "Adobe", date: "Jul 5",  amount: "$14,999" },
];

const eolAssets = [
  { tag: "LAP-001", name: "Dell Latitude 5530",  category: "Laptop",  assignedTo: "John Smith",   dueDate: "Mar 2024", remaining: "Past EOL", status: "Past EOL",   statusColor: "bg-red-100 text-red-700"       },
  { tag: "LAP-002", name: "HP EliteBook 840 G8", category: "Laptop",  assignedTo: "Sarah Lee",    dueDate: "Jun 2025", remaining: "Past EOL", status: "Past EOL",   statusColor: "bg-red-100 text-red-700"       },
  { tag: "LAP-003", name: 'MacBook Pro 14"',     category: "Laptop",  assignedTo: "IT Admin",     dueDate: "Sep 2026", remaining: "21 days",  status: "0–30 days",  statusColor: "bg-orange-100 text-orange-700" },
  { tag: "DKT-004", name: "Dell OptiPlex 7080",  category: "Desktop", assignedTo: "Reception",    dueDate: "Oct 2026", remaining: "36 days",  status: "31–60 days", statusColor: "bg-amber-100 text-amber-700"  },
  { tag: "LAP-009", name: "Lenovo ThinkPad T490",category: "Laptop",  assignedTo: "Tech Support", dueDate: "Nov 2026", remaining: "77 days",  status: "61–90 days", statusColor: "bg-yellow-100 text-yellow-700" },
];

const quickActions = [
  { label: "Add New Asset",      icon: Plus,     color: "bg-blue-50 text-blue-600"     },
  { label: "Add Inventory Item", icon: Package,  color: "bg-purple-50 text-purple-600" },
  { label: "Import Assets",      icon: Upload,   color: "bg-green-50 text-green-600"   },
  { label: "Generate Report",    icon: FileText, color: "bg-amber-50 text-amber-600"   },
];

type DonutEntry = { name: string; value: number; color: string };

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
  return (
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
          <p className="text-2xl font-bold text-gray-900">$412,500</p>
          <p className="text-[11px] text-gray-500">Total Asset Value</p>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-green-600">
            <TrendingUp size={10} /> 7.2% from last month
          </p>
        </div>
      </div>

      {/* Three donut charts + EOL time bucket table */}
      <div className="mb-5 grid grid-cols-4 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-900">Assets by Category</p>
          <DonutChart data={categoryData} total={247} label="Total" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-900">Inventory Status</p>
          <DonutChart data={inventoryStatusData} total={147} label="Items" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-900">Lifecycle Summary</p>
          <DonutChart data={lifecycleSummaryData} total={247} label="Total" />
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
              <div key={b.label} className="flex items-center justify-between">
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
                  <td className={`px-5 py-3 font-medium ${asset.status === "Past EOL" ? "text-red-600" : "text-gray-700"}`}>{asset.remaining}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${asset.statusColor}`}>{asset.status}</span>
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
  );
}
