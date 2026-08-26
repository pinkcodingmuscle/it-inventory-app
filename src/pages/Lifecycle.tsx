import { useState } from "react";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

type Status = "Past EOL" | "0\u201330 days" | "31\u201360 days" | "61\u201390 days" | "On Track";

const stats = [
  { label: "Past EOL",           value: 8,  icon: AlertTriangle, color: "bg-red-50 text-red-600"     },
  { label: "Due in 90 Days",     value: 15, icon: Clock,         color: "bg-amber-50 text-amber-600" },
  { label: "Replaced This Year", value: 23, icon: CheckCircle,   color: "bg-green-50 text-green-600" },
];

const assets: { name: string; type: string; assignedTo: string; purchaseDate: string; age: string; dueDate: string; remaining: string; status: Status }[] = [
  { name: "Dell Latitude 5530",  type: "Laptop",  assignedTo: "John Smith",    purchaseDate: "Mar 2021", age: "5.4 yrs", dueDate: "Mar 2024", remaining: "Past EOL", status: "Past EOL"         },
  { name: "HP EliteBook 840 G8", type: "Laptop",  assignedTo: "Sarah Lee",     purchaseDate: "Jan 2021", age: "5.6 yrs", dueDate: "Jun 2025", remaining: "Past EOL", status: "Past EOL"         },
  { name: 'MacBook Pro 14"',     type: "Laptop",  assignedTo: "IT Admin",      purchaseDate: "Jun 2022", age: "4.2 yrs", dueDate: "Sep 2026", remaining: "21 days",  status: "0\u201330 days"   },
  { name: "Dell OptiPlex 7080",  type: "Desktop", assignedTo: "Reception",     purchaseDate: "Aug 2021", age: "5.0 yrs", dueDate: "Oct 2026", remaining: "36 days",  status: "31\u201360 days" },
  { name: "Lenovo ThinkPad T490",type: "Laptop",  assignedTo: "Tech Support",  purchaseDate: "Aug 2023", age: "3.0 yrs", dueDate: "Nov 2026", remaining: "77 days",  status: "61\u201390 days" },
  { name: "Lenovo ThinkCentre",  type: "Desktop", assignedTo: "HR Department", purchaseDate: "Feb 2023", age: "3.5 yrs", dueDate: "Feb 2027", remaining: "162 days", status: "On Track"        },
  { name: "HP LaserJet M404n",   type: "Printer", assignedTo: "IT Storage",    purchaseDate: "Nov 2022", age: "3.8 yrs", dueDate: "Nov 2028", remaining: "2+ years", status: "On Track"        },
];

const statusStyles: Record<Status, string> = {
  "Past EOL":         "bg-red-100 text-red-700",
  "0\u201330 days":   "bg-orange-100 text-orange-700",
  "31\u201360 days":  "bg-amber-100 text-amber-700",
  "61\u201390 days":  "bg-yellow-100 text-yellow-700",
  "On Track":         "bg-green-100 text-green-700",
};

const filters = ["All", "Past EOL", "0\u201330 days", "31\u201360 days", "61\u201390 days", "On Track"] as const;
type Filter = typeof filters[number];

export default function Lifecycle() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const filtered = activeFilter === "All" ? assets : assets.filter((a) => a.status === activeFilter);

  return (
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
                {f}
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
              <tr key={asset.name} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{asset.name}</td>
                <td className="px-6 py-4 text-gray-600">{asset.type}</td>
                <td className="px-6 py-4 text-gray-600">{asset.assignedTo}</td>
                <td className="px-6 py-4 text-gray-600">{asset.purchaseDate}</td>
                <td className="px-6 py-4 text-gray-600">{asset.age}</td>
                <td className="px-6 py-4 text-gray-600">{asset.dueDate}</td>
                <td className={`px-6 py-4 font-medium ${asset.status === "Past EOL" ? "text-red-600" : "text-gray-700"}`}>{asset.remaining}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[asset.status]}`}>
                    {asset.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}