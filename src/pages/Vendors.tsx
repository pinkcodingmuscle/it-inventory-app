import { useState } from "react";
import { Search, Plus, Building2 } from "lucide-react";

const vendorData = [
  { id: 1, name: "Dell Technologies", category: "Hardware",    contact: "Mike Rogers", email: "mrogers@dell.com",          phone: "(512) 338-4400", supplied: 128 },
  { id: 2, name: "HP Inc.",           category: "Hardware",    contact: "Amy Chen",    email: "achen@hp.com",              phone: "(650) 857-1501", supplied: 64  },
  { id: 3, name: "Apple",             category: "Hardware",    contact: "Sales Desk",  email: "sales@apple.com",           phone: "(408) 996-1010", supplied: 12  },
  { id: 4, name: "Microsoft",         category: "Software",    contact: "Tom Haley",   email: "thaley@microsoft.com",      phone: "(425) 882-8080", supplied: 156 },
  { id: 5, name: "Adobe Systems",     category: "Software",    contact: "Laura Kim",   email: "lkim@adobe.com",            phone: "(408) 536-6000", supplied: 37  },
  { id: 6, name: "Lenovo",            category: "Hardware",    contact: "Sales Team",  email: "sales@lenovo.com",          phone: "(919) 257-6700", supplied: 29  },
  { id: 7, name: "Cable Matters",     category: "Accessories", contact: "Orders Team", email: "orders@cablematters.com",   phone: "(503) 217-3800", supplied: 88  },
];

const categoryColors: Record<string, string> = {
  Hardware:    "bg-blue-100 text-blue-700",
  Software:    "bg-purple-100 text-purple-700",
  Accessories: "bg-green-100 text-green-700",
};

export default function Vendors() {
  const [search, setSearch] = useState("");

  const filtered = vendorData.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
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
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryColors[vendor.category] ?? "bg-gray-100 text-gray-600"}`}>
                    {vendor.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{vendor.contact}</td>
                <td className="px-6 py-4 text-gray-500">{vendor.email}</td>
                <td className="px-6 py-4 text-gray-500">{vendor.phone}</td>
                <td className="px-6 py-4 text-gray-600">{vendor.supplied}</td>
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
  );
}