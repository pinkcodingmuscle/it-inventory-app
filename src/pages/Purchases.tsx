import { useState } from "react";
import { Search } from "lucide-react";

type PurchaseStatus = "Open" | "Received" | "Cancelled";

const purchaseData: { id: number; po: string; vendor: string; items: string; date: string; total: string; status: PurchaseStatus }[] = [
  { id: 1, po: "PO-2024-083", vendor: "Cable Matters",    items: "20\u00d7 USB-C Cables",    date: "Aug 18, 2024", total: "$180",    status: "Open"      },
  { id: 2, po: "PO-2024-082", vendor: "HP Inc.",           items: "3\u00d7 HP 58A Toner",     date: "Aug 15, 2024", total: "$420",    status: "Open"      },
  { id: 3, po: "PO-2024-081", vendor: "Dell Technologies", items: "10\u00d7 Latitude 5530",   date: "Aug 10, 2024", total: "$18,500", status: "Received"  },
  { id: 4, po: "PO-2024-079", vendor: "Apple",             items: "2\u00d7 MacBook Pro 14\"", date: "Jul 28, 2024", total: "$5,998",  status: "Received"  },
  { id: 5, po: "PO-2024-075", vendor: "Adobe Systems",     items: "Adobe CC \u2014 25 seats", date: "Jul 5, 2024",  total: "$14,999", status: "Received"  },
  { id: 6, po: "PO-2024-070", vendor: "Lenovo",            items: "5\u00d7 ThinkCentre M70q", date: "Jun 20, 2024", total: "$7,250",  status: "Cancelled" },
];

const statusStyles: Record<PurchaseStatus, string> = {
  Open:      "bg-blue-100 text-blue-700",
  Received:  "bg-green-100 text-green-700",
  Cancelled: "bg-gray-100 text-gray-600",
};

const filters = ["All", "Open", "Received", "Cancelled"] as const;
type Filter = typeof filters[number];

export function Purchases() {
  const [search, setSearch]             = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const filtered = purchaseData.filter((p) => {
    const matchesSearch = p.po.toLowerCase().includes(search.toLowerCase()) ||
                          p.vendor.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "All" || p.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const openCount     = purchaseData.filter((p) => p.status === "Open").length;
  const receivedCount = purchaseData.filter((p) => p.status === "Received").length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Track purchase orders and procurement history.</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-blue-600">{openCount}</p>
          <p className="mt-1 text-sm text-gray-500">Open POs</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-green-600">{receivedCount}</p>
          <p className="mt-1 text-sm text-gray-500">Received</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">$46,347</p>
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
              {f}
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
                <td className="px-6 py-4 font-mono text-xs font-medium text-gray-900">{p.po}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{p.vendor}</td>
                <td className="px-6 py-4 text-gray-600">{p.items}</td>
                <td className="px-6 py-4 text-gray-600">{p.date}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{p.total}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[p.status]}`}>
                    {p.status}
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
  );
}