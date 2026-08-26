import { useState } from "react";
import { Laptop, Search, Eye } from "lucide-react";

type AssetStatus = "Active" | "In Storage" | "Under Repair" | "Retired";

const stats = [
  { label: "Total Assets", value: 247 },
  { label: "Active",       value: 192 },
  { label: "In Storage",   value: 42  },
  { label: "Under Repair", value: 13  },
];

const assetData: { id: number; tag: string; name: string; type: string; serial: string; assignedTo: string; location: string; status: AssetStatus }[] = [
  { id: 1,  tag: "LAP-001", name: "Dell Latitude 5530",      type: "Laptop",  serial: "DL55-001", assignedTo: "John Smith",    location: "Main Office",        status: "Active"       },
  { id: 2,  tag: "LAP-002", name: "HP EliteBook 840 G8",     type: "Laptop",  serial: "HP84-002", assignedTo: "Sarah Lee",     location: "Main Office",        status: "Active"       },
  { id: 3,  tag: "LAP-003", name: 'MacBook Pro 14"',         type: "Laptop",  serial: "MB14-003", assignedTo: "IT Admin",      location: "Help Desk",          status: "Active"       },
  { id: 4,  tag: "DKT-004", name: "Dell OptiPlex 7080",      type: "Desktop", serial: "OP70-004", assignedTo: "Reception",     location: "Main Office",        status: "Active"       },
  { id: 5,  tag: "DKT-005", name: "Lenovo ThinkCentre M70q", type: "Desktop", serial: "TC70-005", assignedTo: "HR Department", location: "Main Office",        status: "Active"       },
  { id: 6,  tag: "PRN-006", name: "HP LaserJet M404n",       type: "Printer", serial: "LJ40-006", assignedTo: "\u2014",        location: "IT Storage Room",    status: "In Storage"   },
  { id: 7,  tag: "LAP-007", name: "Dell Latitude 5420",      type: "Laptop",  serial: "DL54-007", assignedTo: "\u2014",        location: "IT Storage Room",    status: "In Storage"   },
  { id: 8,  tag: "LAP-008", name: "HP ProBook 450 G8",       type: "Laptop",  serial: "PB45-008", assignedTo: "\u2014",        location: "Off-site Warehouse", status: "Retired"      },
  { id: 9,  tag: "LAP-009", name: "Lenovo ThinkPad T490",    type: "Laptop",  serial: "TP49-009", assignedTo: "Tech Support",  location: "Help Desk",          status: "Under Repair" },
  { id: 10, tag: "MON-010", name: 'Dell 27" Monitor',        type: "Monitor", serial: "DM27-010", assignedTo: "John Smith",    location: "Main Office",        status: "Active"       },
];

const statusStyles: Record<AssetStatus, string> = {
  "Active":       "bg-green-100 text-green-700",
  "In Storage":   "bg-blue-100 text-blue-700",
  "Under Repair": "bg-amber-100 text-amber-700",
  "Retired":      "bg-gray-100 text-gray-600",
};

const filters = ["All", "Active", "In Storage", "Under Repair", "Retired"] as const;
type Filter = typeof filters[number];

export function Assets() {
  const [search, setSearch]             = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const filtered = assetData.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
                          a.serial.toLowerCase().includes(search.toLowerCase()) ||
                          a.assignedTo.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "All" || a.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Track all individually serialized IT assets.</p>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-5">
        {stats.map((s) => (
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
              {f}
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
                    {asset.status}
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
  );
}