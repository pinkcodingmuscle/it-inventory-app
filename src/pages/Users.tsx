import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { DataState } from "../components/DataState";
import { useData } from "../context/useData";
import { getUserStats, listUsers } from "../lib/selectors";

const statusStyles: Record<"active" | "inactive", string> = {
  active:   "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
};

const avatarColors = [
  "bg-purple-400", "bg-blue-400", "bg-green-400", "bg-pink-400",
  "bg-amber-400",  "bg-indigo-400", "bg-rose-400",
];

export default function Users() {
  const { revision } = useData();
  const [search, setSearch] = useState("");

  const userData = useMemo(() => listUsers(), [revision]);
  const stats = useMemo(() => getUserStats(), [revision]);

  const filtered = userData.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DataState>
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Manage employees and their asset assignments.</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="mt-1 text-sm text-gray-500">Total Users</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          <p className="mt-1 text-sm text-gray-500">Active</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-400">{stats.inactive}</p>
          <p className="mt-1 text-sm text-gray-500">Inactive</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, role, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <button className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
          <Plus size={16} />
          Add User
        </button>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left">User</th>
              <th className="px-6 py-3 text-left">Role</th>
              <th className="px-6 py-3 text-left">Department</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Assets</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((user, i) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColors[i % avatarColors.length]}`}>
                      {user.initials}
                    </div>
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{user.role}</td>
                <td className="px-6 py-4 text-gray-600">{user.department}</td>
                <td className="px-6 py-4 text-gray-500">{user.email}</td>
                <td className="px-6 py-4 text-gray-600">{user.assetCount}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[user.status]}`}>
                    {user.statusLabel}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">No users match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
    </DataState>
  );
}
