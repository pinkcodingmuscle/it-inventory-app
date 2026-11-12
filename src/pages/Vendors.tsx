import { useState } from "react";
import { Search, Plus, Building2, Pencil } from "lucide-react";
import { DataState } from "../components/DataState";
import { Field, FormError, Modal, inputClass, primaryButtonClass, secondaryButtonClass } from "../components/Modal";
import { useData } from "../context/useData";
import { appData } from "../data/store";
import { createVendor, deleteVendor, updateVendor } from "../lib/api";
import { listVendors } from "../lib/selectors";
import type { Vendor } from "../types/domain";

const categoryColors: Record<string, string> = {
  Hardware:    "bg-blue-100 text-blue-700",
  Software:    "bg-purple-100 text-purple-700",
  Accessories: "bg-green-100 text-green-700",
};

const categoryOptions: { value: Vendor["category"]; label: string }[] = [
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "accessories", label: "Accessories" },
  { value: "other", label: "Other" },
];

/** Add a vendor, or edit (and delete) an existing one. */
function VendorModal({ vendor, onClose }: { vendor?: Vendor; onClose: () => void }) {
  const { refresh } = useData();
  const [name, setName] = useState(vendor?.name ?? "");
  const [category, setCategory] = useState<Vendor["category"]>(vendor?.category ?? "hardware");
  const [contactName, setContactName] = useState(vendor?.contactName ?? "");
  const [email, setEmail] = useState(vendor?.email ?? "");
  const [phone, setPhone] = useState(vendor?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const orderCount = vendor ? Object.values(appData.purchaseOrders).filter((po) => po.vendorId === vendor.id).length : 0;

  async function handleDelete() {
    if (!vendor) return;
    setError(null);
    setSaving(true);
    try {
      await deleteVendor(vendor.id);
      onClose();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the vendor.");
      setConfirmingDelete(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError("Vendor name is required.");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("That email address doesn't look valid.");
    setSaving(true);
    try {
      if (vendor) {
        await updateVendor(vendor.id, {
          name: name.trim(),
          category,
          contactName: contactName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        });
      } else {
        await createVendor({
          name: name.trim(),
          category,
          contactName: contactName.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        });
      }
      onClose();
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save the vendor.";
      setError(/unique/i.test(message) ? "A vendor with that name already exists." : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={vendor ? `Edit ${vendor.name}` : "Add Vendor"}
      onClose={onClose}
      footer={
        confirmingDelete ? (
          <>
            <span className="mr-auto self-center text-sm text-gray-700">Delete {vendor?.name}? Items that named it keep existing.</span>
            <button onClick={() => setConfirmingDelete(false)} className={secondaryButtonClass}>Keep</button>
            <button onClick={handleDelete} disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? "Deleting..." : "Delete"}
            </button>
          </>
        ) : (
          <>
            {vendor && (
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={orderCount > 0}
                title={orderCount > 0 ? `Has ${orderCount} purchase order${orderCount === 1 ? "" : "s"}, so it can't be deleted` : undefined}
                className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete
              </button>
            )}
            <button onClick={onClose} className={secondaryButtonClass}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>
              {saving ? "Saving..." : vendor ? "Save" : "Add Vendor"}
            </button>
          </>
        )
      }
    >
      <FormError message={error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vendor name *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Dell Technologies" autoFocus />
        </Field>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value as Vendor["category"])} className={inputClass}>
            {categoryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Contact name">
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export default function Vendors() {
  useData();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);

  const vendorData = listVendors().sort((a, b) => a.name.localeCompare(b.name));

  const filtered = vendorData.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.categoryLabel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    <DataState>
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <div className="mb-8">
        <p className="text-gray-500">Manage suppliers and procurement contacts.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex h-10 min-w-[12rem] flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Vendor
        </button>
      </div>

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left">Vendor</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-left">Contact</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Phone</th>
              <th className="px-6 py-3 text-left">Items Supplied</th>
              <th className="px-6 py-3" />
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
                <td className="px-6 py-4 text-gray-500">
                  {vendor.email !== "—" ? <a href={`mailto:${vendor.email}`} className="hover:text-blue-600 hover:underline">{vendor.email}</a> : vendor.email}
                </td>
                <td className="px-6 py-4 text-gray-500">{vendor.phone}</td>
                <td className="px-6 py-4 text-gray-600">{vendor.suppliedCount}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setEditing(appData.vendors[vendor.id])}
                    aria-label={`Edit ${vendor.name}`}
                    title="Edit"
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                  {vendorData.length === 0 ? "No vendors yet. Click Add Vendor to create one." : "No vendors match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
    </DataState>
    {editing && <VendorModal vendor={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
