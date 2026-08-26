import { useState } from "react";
import { Search } from "lucide-react";

const inventoryData = [
  { id: 1,  name: "Dell Latitude 5530",       category: "Laptops",     qty: 12, available: 8,  location: "IT Storage Room" },
  { id: 2,  name: "HP EliteBook 840 G8",      category: "Laptops",     qty: 8,  available: 5,  location: "IT Storage Room" },
  { id: 3,  name: 'MacBook Pro 14"',          category: "Laptops",     qty: 4,  available: 1,  location: "Help Desk"       },
  { id: 4,  name: "Dell OptiPlex 7080",       category: "Desktops",    qty: 15, available: 10, location: "IT Storage Room" },
  { id: 5,  name: "Lenovo ThinkCentre M70q",  category: "Desktops",    qty: 10, available: 6,  location: "IT Storage Room" },
  { id: 6,  name: "HP LaserJet M404n",        category: "Printers",    qty: 5,  available: 3,  location: "IT Storage Room" },
  { id: 7,  name: 'Dell 27" Monitor',         category: "Monitors",    qty: 22, available: 9,  location: "IT Storage Room" },
  { id: 8,  name: "USB-C Docking Station",    category: "Accessories", qty: 18, available: 7,  location: "IT Storage Room" },
  { id: 9,  name: "USB-C Cables",             category: "Cables",      qty: 2,  available: 2,  location: "IT Storage Room" },
  { id: 10, name: "HDMI Cables",              category: "Cables",      qty: 8,  available: 8,  location: "IT Storage Room" },
  { id: 11, name: "HP 58A Toner",             category: "Toner",       qty: 0,  available: 0,  location: "IT Storage Room" },
  { id: 12, name: "Wireless Mice",            category: "Peripherals", qty: 3,  available: 3,  location: "IT Storage Room" },
];

const categories = ["All", ...Array.from(new Set(inventoryData.map((i) => i.category)))];

export function Inventory() {
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("All");

  const filtered = inventoryData.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat    = category === "All" || item.category === category;
    return matchesSearch && matchesCat;
  });

  const totalQty       = inventoryData.reduce((s, i) => s + i.qty, 0);
  const totalAvailable = inventoryData.reduce((s, i) => s + i.available, 0);
  const outOfStock     = inventoryData.filter((i) => i.qty === 0).length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Overview of all stockable IT items and availability.</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">{totalQty}</p>
          <p className="mt-1 text-sm text-gray-500">Total Units</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-green-600">{totalAvailable}</p>
          <p className="mt-1 text-sm text-gray-500">Available</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-red-600">{outOfStock}</p>
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
                <td className="px-6 py-4 font-semibold text-gray-900">{item.qty}</td>
                <td className="px-6 py-4 font-medium text-green-600">{item.available}</td>
                <td className="px-6 py-4 text-gray-600">{item.qty - item.available}</td>
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
  );
}