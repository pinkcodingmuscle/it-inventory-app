import { useState } from "react";
import { Search, AlertTriangle } from "lucide-react";

type StockStatus = "OK" | "Low" | "Out";

const consumableData: { id: number; name: string; category: string; stock: number; threshold: number; location: string; status: StockStatus }[] = [
  { id: 1, name: "USB-C Cables",          category: "Cables",       stock: 2,  threshold: 5,  location: "IT Storage Room", status: "Low" },
  { id: 2, name: "HDMI Cables",           category: "Cables",       stock: 8,  threshold: 5,  location: "IT Storage Room", status: "OK"  },
  { id: 3, name: "HP 58A Toner",          category: "Toner",        stock: 0,  threshold: 2,  location: "IT Storage Room", status: "Out" },
  { id: 4, name: "AA Batteries",          category: "Batteries",    stock: 24, threshold: 10, location: "Help Desk",       status: "OK"  },
  { id: 5, name: "Wireless Mice",         category: "Peripherals",  stock: 3,  threshold: 3,  location: "IT Storage Room", status: "Low" },
  { id: 6, name: "USB-A to USB-B Cables", category: "Cables",       stock: 5,  threshold: 3,  location: "IT Storage Room", status: "OK"  },
  { id: 7, name: "Laptop Power Adapters", category: "Accessories",  stock: 0,  threshold: 2,  location: "IT Storage Room", status: "Out" },
  { id: 8, name: "Cleaning Wipes",        category: "Accessories",  stock: 40, threshold: 10, location: "Help Desk",       status: "OK"  },
];

const statusStyles: Record<StockStatus, string> = {
  OK:  "bg-green-100 text-green-700",
  Low: "bg-amber-100 text-amber-700",
  Out: "bg-red-100 text-red-700",
};

export function Consumables() {
  const [search, setSearch] = useState("");

  const filtered = consumableData.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowCount = consumableData.filter((c) => c.status === "Low").length;
  const outCount = consumableData.filter((c) => c.status === "Out").length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Monitor bulk stock items and reorder thresholds.</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">{consumableData.length}</p>
          <p className="mt-1 text-sm text-gray-500">Item Types</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-amber-600">{lowCount}</p>
          <p className="mt-1 text-sm text-gray-500">Low Stock</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-red-600">{outCount}</p>
          <p className="mt-1 text-sm text-gray-500">Out of Stock</p>
        </div>
      </div>

      <div className="mb-4 flex h-10 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search items or categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left">Item</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-left">Stock</th>
              <th className="px-6 py-3 text-left">Threshold</th>
              <th className="px-6 py-3 text-left">Location</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    {item.status !== "OK" && (
                      <AlertTriangle size={14} className={item.status === "Out" ? "text-red-500" : "text-amber-500"} />
                    )}
                    {item.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{item.category}</td>
                <td className="px-6 py-4 font-semibold text-gray-900">{item.stock}</td>
                <td className="px-6 py-4 text-gray-500">{item.threshold}</td>
                <td className="px-6 py-4 text-gray-600">{item.location}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[item.status]}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">No items match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}