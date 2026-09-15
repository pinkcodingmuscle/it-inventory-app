import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DataState } from "../components/DataState";
import { useData } from "../context/useData";
import { getSoftwareStats, listSoftwareLicenses, type SoftwareStatus } from "../lib/selectors";

const statusStyles: Record<SoftwareStatus, string> = {
  active:        "bg-green-100 text-green-700",
  expiring_soon: "bg-amber-100 text-amber-700",
  expired:       "bg-red-100 text-red-700",
};

const filters = ["All", "active", "expiring_soon", "expired"] as const;
type Filter = typeof filters[number];
const filterLabels: Record<Filter, string> = {
  All: "All",
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
};

export function Software() {
  const { revision } = useData();
  const [search, setSearch]             = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const licenseData = useMemo(() => listSoftwareLicenses(), [revision]);
  const stats = useMemo(() => getSoftwareStats(), [revision]);

  const filtered = licenseData.filter((l) => {
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
                          l.vendor.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "All" || l.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <DataState>
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Manage software licenses, seats, and expiry dates.</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">{stats.totalLicenses}</p>
          <p className="mt-1 text-sm text-gray-500">Total Licenses</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-amber-600">{stats.expiringCount}</p>
          <p className="mt-1 text-sm text-gray-500">Expiring Soon</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">{stats.seatsAvailable}</p>
          <p className="mt-1 text-sm text-gray-500">Seats Available</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search licenses..."
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
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left">Software</th>
              <th className="px-6 py-3 text-left">Vendor</th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Seats</th>
              <th className="px-6 py-3 text-left">Used</th>
              <th className="px-6 py-3 text-left">Expiry</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((lic) => (
              <tr key={lic.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{lic.name}</td>
                <td className="px-6 py-4 text-gray-600">{lic.vendor}</td>
                <td className="px-6 py-4 text-gray-600">{lic.type}</td>
                <td className="px-6 py-4 text-gray-900">{lic.seats}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-blue-500"
                        style={{ width: `${Math.round((lic.used / lic.seats) * 100)}%` }}
                      />
                    </div>
                    <span className="text-gray-600">{lic.used}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{lic.expiry}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[lic.status]}`}>
                    {lic.statusLabel}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">No licenses match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
    </DataState>
  );
}
