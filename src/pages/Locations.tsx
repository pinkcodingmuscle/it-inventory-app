import { useState } from "react";
import { MapPin, Pencil, Plus, Search } from "lucide-react";
import { DataState } from "../components/DataState";
import { Field, FormError, Modal, inputClass, primaryButtonClass, secondaryButtonClass } from "../components/Modal";
import { usePermissions } from "../context/authValue";
import { useData } from "../context/useData";
import { appData } from "../data/store";
import { createLocation, deleteLocation, updateLocation } from "../lib/api";
import { listLocations, type LocationRow } from "../lib/selectors";
import { useLinkParams } from "../lib/useLinkParams";
import type { Location } from "../types/domain";

const typeOptions: { value: Location["type"]; label: string }[] = [
  { value: "storage", label: "Storage" },
  { value: "office", label: "Office" },
  { value: "meeting_room", label: "Meeting" },
  { value: "remote", label: "Remote" },
];

const typeColors: Record<string, string> = {
  Storage: "bg-blue-100 text-blue-700",
  Office:  "bg-purple-100 text-purple-700",
  Meeting: "bg-green-100 text-green-700",
  Remote:  "bg-amber-100 text-amber-700",
};

/** Add a location, or edit (and delete) an existing one. */
function LocationModal({ row, onClose }: { row?: LocationRow; onClose: () => void }) {
  const { refresh } = useData();
  const location = row ? appData.locations[row.id] : undefined;
  const users = Object.values(appData.users)
    .filter((u) => u.status === "active" || u.id === location?.managerUserId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const [name, setName] = useState(location?.name ?? "");
  const [type, setType] = useState<Location["type"]>(location?.type ?? "storage");
  const [managerId, setManagerId] = useState(location?.managerUserId ?? "");
  const [notes, setNotes] = useState(location?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError("Name is required.");
    setSaving(true);
    try {
      if (location) {
        await updateLocation(location.id, { name: name.trim(), type, managerUserId: managerId || null, notes: notes.trim() || null });
      } else {
        await createLocation({ name: name.trim(), type, managerUserId: managerId || undefined, notes: notes.trim() || undefined });
      }
      onClose();
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't save the location.";
      setError(/unique/i.test(message) ? "A location with that name already exists." : message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!location) return;
    setError(null);
    setSaving(true);
    try {
      await deleteLocation(location.id);
      onClose();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the location.");
      setConfirmingDelete(false);
    } finally {
      setSaving(false);
    }
  }

  const hasStock = (row?.stockItemCount ?? 0) > 0;

  return (
    <Modal
      title={location ? `Edit ${location.name}` : "Add Location"}
      onClose={onClose}
      footer={
        confirmingDelete ? (
          <>
            <span className="mr-auto self-center text-sm text-gray-700">Delete {location?.name}?</span>
            <button onClick={() => setConfirmingDelete(false)} className={secondaryButtonClass}>Keep</button>
            <button onClick={handleDelete} disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? "Deleting..." : "Delete"}
            </button>
          </>
        ) : (
          <>
            {location && (
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={hasStock}
                title={hasStock ? "Move or remove its stock first" : undefined}
                className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete
              </button>
            )}
            <button onClick={onClose} className={secondaryButtonClass}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>
              {saving ? "Saving..." : location ? "Save" : "Add Location"}
            </button>
          </>
        )
      }
    >
      <FormError message={error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Server Room" autoFocus />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as Location["type"])} className={inputClass}>
            {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Manager">
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={inputClass}>
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Optional description" />
        </Field>
      </div>
    </Modal>
  );
}

export default function Locations() {
  useData();
  const { canManage } = usePermissions();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LocationRow | "new" | null>(null);

  // "+ Add Location" on the Settings page links here with ?new=1.
  useLinkParams((params) => {
    if (params.get("new") === "1" && canManage) setEditing("new");
  });

  const locations = listLocations().sort((a, b) => a.name.localeCompare(b.name));
  const term = search.toLowerCase();
  const filtered = locations.filter((l) => l.name.toLowerCase().includes(term) || l.typeLabel.toLowerCase().includes(term));

  return (
    <>
    <DataState>
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <div className="mb-8">
        <p className="text-gray-500">Manage where inventory is physically stored.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex h-10 min-w-[12rem] flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search locations..."
            aria-label="Search locations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        {canManage && (
          <button
            onClick={() => setEditing("new")}
            className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Location
          </button>
        )}
      </div>

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left">Location</th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Stock Items</th>
              <th className="px-6 py-3 text-left">Units</th>
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
                <td className="px-6 py-4 text-gray-600">{loc.stockItemCount}</td>
                <td className="px-6 py-4 text-gray-600">{loc.totalUnits}</td>
                <td className="px-6 py-4 text-gray-600">{loc.manager}</td>
                <td className="px-6 py-4 text-gray-500">{loc.notes}</td>
                <td className="px-6 py-4 text-right">
                  {canManage && (
                    <button
                      onClick={() => setEditing(loc)}
                      aria-label={`Edit ${loc.name}`}
                      title="Edit"
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                  No locations match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
    </DataState>
    {editing && <LocationModal row={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
