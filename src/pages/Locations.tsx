import { useMemo, useState } from "react";
import { MapPin, Plus, Search } from "lucide-react";
import { DataState } from "../components/DataState";
import { useData } from "../context/useData";
import { appData } from "../data/store";
import { createLocation, deleteLocation } from "../lib/api";
import { listLocations } from "../lib/selectors";
import type { Location } from "../types/domain";

const typeOptions = ["Storage", "Office", "Meeting", "Remote"] as const;

const typeValues: Record<(typeof typeOptions)[number], Location["type"]> = {
  Storage: "storage",
  Office: "office",
  Meeting: "meeting_room",
  Remote: "remote",
};

const typeColors: Record<string, string> = {
  Storage: "bg-blue-100 text-blue-700",
  Office:  "bg-purple-100 text-purple-700",
  Meeting: "bg-green-100 text-green-700",
  Remote:  "bg-amber-100 text-amber-700",
};

export default function Locations() {
  const { revision, refresh } = useData();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<(typeof typeOptions)[number]>("Office");
  const [newManagerId, setNewManagerId] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const locations = useMemo(() => listLocations(), [revision]);
  const users = useMemo(() => Object.values(appData.users), [revision]);

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.typeLabel.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      await createLocation({
        name: newName.trim(),
        type: typeValues[newType],
        managerUserId: newManagerId || undefined,
        notes: newNotes.trim() || undefined,
      });
      await refresh();
      setNewName(""); setNewType("Office"); setNewManagerId(""); setNewNotes("");
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create location.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setRowError(null);
    try {
      await deleteLocation(id);
      await refresh();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Failed to delete location.");
    }
  }

  return (
    <DataState>
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

      {rowError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {rowError}
        </div>
      )}

      {/* Inline add form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-800">New Location</h3>
          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}
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
                onChange={(e) => setNewType(e.target.value as (typeof typeOptions)[number])}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {typeOptions.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Manager</label>
              <select
                value={newManagerId}
                onChange={(e) => setNewManagerId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
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
            <button
              onClick={handleAdd}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
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
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeColors[loc.typeLabel] ?? "bg-gray-100 text-gray-600"}`}>
                    {loc.typeLabel}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{loc.assetCount}</td>
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
    </DataState>
  );
}
