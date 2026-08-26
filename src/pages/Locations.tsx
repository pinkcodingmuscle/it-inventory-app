import { useState } from "react";
import { MapPin, Plus, Search } from "lucide-react";

type Location = {
  id: number;
  name: string;
  type: string;
  assets: number;
  manager: string;
  notes: string;
};

const initialLocations: Location[] = [
  { id: 1, name: "IT Storage Room",      type: "Storage",  assets: 84, manager: "Esther Mukuye",  notes: "Primary hardware storage, B1 level"         },
  { id: 2, name: "Help Desk",            type: "Office",   assets: 12, manager: "Esther Mukuye",  notes: "Front-line support station"                 },
  { id: 3, name: "Main Office",          type: "Office",   assets: 61, manager: "HR Department",  notes: "Open-plan floor, desks 1–40"               },
  { id: 4, name: "Conference Room A",    type: "Meeting",  assets:  6, manager: "Facilities",     notes: "AV equipment, projector, video bar"        },
  { id: 5, name: "Conference Room B",    type: "Meeting",  assets:  4, manager: "Facilities",     notes: "Smaller meeting room, floor 2"            },
  { id: 6, name: "Assigned to Employee", type: "Remote",   assets: 73, manager: "Esther Mukuye",  notes: "Assets checked out to individual users"   },
  { id: 7, name: "Off-site Warehouse",   type: "Storage",  assets:  7, manager: "Ops Team",       notes: "Overflow storage, requires access request" },
];

const typeColors: Record<string, string> = {
  Storage: "bg-blue-100 text-blue-700",
  Office:  "bg-purple-100 text-purple-700",
  Meeting: "bg-green-100 text-green-700",
  Remote:  "bg-amber-100 text-amber-700",
};

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Office");
  const [newManager, setNewManager] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.type.toLowerCase().includes(search.toLowerCase())
  );

  function handleAdd() {
    if (!newName.trim()) return;
    setLocations((prev) => [
      ...prev,
      { id: prev.length + 1, name: newName.trim(), type: newType, assets: 0, manager: newManager.trim() || "Unassigned", notes: newNotes.trim() },
    ]);
    setNewName(""); setNewType("Office"); setNewManager(""); setNewNotes("");
    setShowForm(false);
  }

  function handleDelete(id: number) {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Manage where assets are physically stored or assigned.</p>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Location
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-800">New Location</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="e.g. Server Room"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {Object.keys(typeColors).map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Manager</label>
              <input
                type="text"
                value={newManager}
                onChange={(e) => setNewManager(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="e.g. IT Admin"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleAdd} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Save
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Locations table */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left">Location</th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Assets</th>
              <th className="px-6 py-3 text-left">Manager</th>
              <th className="px-6 py-3 text-left">Notes</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((loc) => (
              <tr key={loc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <MapPin size={15} className="text-gray-400" />
                    {loc.name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeColors[loc.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {loc.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{loc.assets}</td>
                <td className="px-6 py-4 text-gray-600">{loc.manager}</td>
                <td className="px-6 py-4 text-gray-500">{loc.notes}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(loc.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                  No locations match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}