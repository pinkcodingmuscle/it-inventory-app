import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DataState } from "../components/DataState";
import { useData } from "../context/useData";
import { getInventoryStats, listStockItems } from "../lib/selectors";

export function Inventory() {
  const { revision } = useData();
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("All");

  const inventoryData = useMemo(() => listStockItems(), [revision]);
  const stats = useMemo(() => getInventoryStats(), [revision]);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(inventoryData.map((i) => i.category)))],
    [inventoryData]
  );

  const filtered = inventoryData.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat    = category === "All" || item.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <DataState>
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Overview of all stockable IT items and availability.</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">{stats.totalQty}</p>
          <p className="mt-1 text-sm text-gray-500">Total Units</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-green-600">{stats.totalAvailable}</p>
          <p className="mt-1 text-sm text-gray-500">Available</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
          <p className="mt-1 text-sm text-gray-500">Out of Stock</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none"
        >
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left">Item</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-left">Total Qty</th>
              <th className="px-6 py-3 text-left">Available</th>
              <th className="px-6 py-3 text-left">In Use</th>
              <th className="px-6 py-3 text-left">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-gray-600">{item.category}</td>
                <td className="px-6 py-4 font-semibold text-gray-900">{item.quantity}</td>
                <td className="px-6 py-4 font-medium text-green-600">{item.available}</td>
                <td className="px-6 py-4 text-gray-600">{item.inUse}</td>
                <td className="px-6 py-4 text-gray-600">{item.location}</td>
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
    </DataState>
  );
}
