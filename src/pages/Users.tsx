import { useState } from "react";
import { Search, Plus } from "lucide-react";

type UserStatus = "Active" | "Inactive";

const userData: { id: number; name: string; initials: string; role: string; department: string; email: string; assets: number; status: UserStatus }[] = [
  { id: 1, name: "Esther Mukuye",  initials: "EM", role: "IT Administrator", department: "IT",         email: "e.mukuye@kayaku.com",   assets: 3, status: "Active"   },
  { id: 2, name: "John Smith",     initials: "JS", role: "Engineer",          department: "Operations", email: "j.smith@kayaku.com",    assets: 2, status: "Active"   },
  { id: 3, name: "Sarah Lee",      initials: "SL", role: "Analyst",           department: "Finance",    email: "s.lee@kayaku.com",      assets: 1, status: "Active"   },
  { id: 4, name: "Michael Brown",  initials: "MB", role: "Manager",           department: "HR",         email: "m.brown@kayaku.com",    assets: 2, status: "Active"   },
  { id: 5, name: "Jennifer Davis", initials: "JD", role: "Receptionist",      department: "Admin",      email: "j.davis@kayaku.com",    assets: 1, status: "Active"   },
  { id: 6, name: "Robert Wilson",  initials: "RW", role: "Tech Support",      department: "IT",         email: "r.wilson@kayaku.com",   assets: 2, status: "Active"   },
  { id: 7, name: "Linda Martinez", initials: "LM", role: "Intern",            department: "Marketing",  email: "l.martinez@kayaku.com", assets: 1, status: "Inactive" },
];

const statusStyles: Record<UserStatus, string> = {
  Active:   "bg-green-100 text-green-700",
  Inactive: "bg-gray-100 text-gray-600",
};

const avatarColors = [
  "bg-purple-400", "bg-blue-400", "bg-green-400", "bg-pink-400",
  "bg-amber-400",  "bg-indigo-400", "bg-rose-400",
];

export default function Users() {
  const [search, setSearch] = useState("");

  const filtered = userData.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = userData.filter((u) => u.status === "Active").length;
  const inactiveCount = userData.filter((u) => u.status === "Inactive").length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Manage employees and their asset assignments.</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">{userData.length}</p>
          <p className="mt-1 text-sm text-gray-500">Total Users</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          <p className="mt-1 text-sm text-gray-500">Active</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-400">{inactiveCount}</p>
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
                <td className="px-6 py-4 text-gray-600">{user.assets}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[user.status]}`}>
                    {user.status}
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
  );
}