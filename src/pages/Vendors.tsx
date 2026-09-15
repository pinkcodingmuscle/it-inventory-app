import { useMemo, useState } from "react";
import { Search, Plus, Building2 } from "lucide-react";
import { DataState } from "../components/DataState";
import { useData } from "../context/useData";
import { listVendors } from "../lib/selectors";

const categoryColors: Record<string, string> = {
  Hardware:    "bg-blue-100 text-blue-700",
  Software:    "bg-purple-100 text-purple-700",
  Accessories: "bg-green-100 text-green-700",
};

export default function Vendors() {
  const { revision } = useData();
  const [search, setSearch] = useState("");

  const vendorData = useMemo(() => listVendors(), [revision]);

  const filtered = vendorData.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.categoryLabel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DataState>
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Manage suppliers and procurement contacts.</p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <button className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
          <Plus size={16} />
          Add Vendor
        </button>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left">Vendor</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-left">Contact</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Phone</th>
              <th className="px-6 py-3 text-left">Assets Supplied</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <Building2 size={15} className="text-gray-400" />
                    {vendor.name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryColors[vendor.categoryLabel] ?? "bg-gray-100 text-gray-600"}`}>
                    {vendor.categoryLabel}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{vendor.contact}</td>
                <td className="px-6 py-4 text-gray-500">{vendor.email}</td>
                <td className="px-6 py-4 text-gray-500">{vendor.phone}</td>
                <td className="px-6 py-4 text-gray-600">{vendor.suppliedCount}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">No vendors match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
    </DataState>
  );
}
