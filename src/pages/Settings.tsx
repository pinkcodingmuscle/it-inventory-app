import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataState } from "../components/DataState";
import { useData } from "../context/useData";
import { appData } from "../data/store";
import { saveSettingsToServer } from "../lib/api";
import { loadSettings, setCurrentSettings, type AppSettings } from "../lib/settings";

const inputClass = "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500";

/** Saves to the server and updates the app's copy. Returns an error message, or null on success. */
async function persist(next: AppSettings): Promise<string | null> {
  try {
    const res = await saveSettingsToServer(next);
    setCurrentSettings(res.settings);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Couldn't save settings.";
  }
}

export default function Settings() {
  // The form is seeded from the loaded settings, so only mount it once data
  // (including settings) has arrived - e.g. when the page is opened directly.
  return (
    <DataState>
      <SettingsForm />
    </DataState>
  );
}

function SettingsForm() {
  useData();
  const navigate = useNavigate();
  const [form, setForm] = useState<AppSettings>(loadSettings);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus(null);
  };

  const usedCategories = new Set(Object.values(appData.catalogItems).map((c) => c.category));
  const categories = Array.from(new Set([...usedCategories, ...form.extraCategories])).sort();
  const locations = Object.values(appData.locations).sort((a, b) => a.name.localeCompare(b.name));

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setStatus({ ok: false, text: `"${name}" is already a category.` });
      return;
    }
    // Saved straight away so it's offered in Add Item even if the rest of the form isn't saved.
    const saved = loadSettings();
    const error = await persist({ ...saved, extraCategories: [...saved.extraCategories, name] });
    if (error) return setStatus({ ok: false, text: error });
    setForm((f) => ({ ...f, extraCategories: [...f.extraCategories, name] }));
    setNewCategory("");
    setAddingCategory(false);
    setStatus({ ok: true, text: `Added category "${name}".` });
  }

  async function removeCategory(name: string) {
    const saved = loadSettings();
    const error = await persist({ ...saved, extraCategories: saved.extraCategories.filter((c) => c !== name) });
    if (error) return setStatus({ ok: false, text: error });
    setForm((f) => ({ ...f, extraCategories: f.extraCategories.filter((c) => c !== name) }));
  }

  async function handleSave() {
    if (!Number.isInteger(form.lowStockThreshold) || form.lowStockThreshold < 0) {
      setStatus({ ok: false, text: "Low-stock threshold must be a whole number, 0 or more." });
      return;
    }
    if (form.supportEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim())) {
      setStatus({ ok: false, text: "Support email doesn't look valid." });
      return;
    }
    setSaving(true);
    const error = await persist({ ...form, organizationName: form.organizationName.trim(), supportEmail: form.supportEmail.trim() });
    setSaving(false);
    // Thresholds and currency feed the stock status and money figures; components
    // re-render through useSettings / the data revision.
    setStatus(error ? { ok: false, text: error } : { ok: true, text: "Settings saved for everyone." });
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <div className="mb-8">
        <p className="text-gray-500">
          Inventory preferences and notifications, shared by everyone in your organization.
        </p>
      </div>

      <div className="space-y-6 pb-10">
        <div className="space-y-6">
        {/* General */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">General</h2>

          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Organization Name</span>
              <input type="text" value={form.organizationName} onChange={(e) => set("organizationName", e.target.value)} className={inputClass} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Default Location</span>
              <select value={form.defaultLocationId} onChange={(e) => set("defaultLocationId", e.target.value)} className={inputClass}>
                <option value="">None (use the first location)</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <span className="mt-1 block text-xs text-gray-400">Pre-selected when adding items or receiving purchase orders.</span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Default Currency</span>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value as AppSettings["currency"])} className={inputClass}>
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
                <option value="EUR">EUR</option>
              </select>
              <span className="mt-1 block text-xs text-gray-400">Changes how amounts are displayed; it doesn't convert them.</span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Support Email</span>
              <input
                type="email"
                value={form.supportEmail}
                onChange={(e) => set("supportEmail", e.target.value)}
                placeholder="e.g. it-help@yourcompany.com"
                className={inputClass}
              />
              <span className="mt-1 block text-xs text-gray-400">Where the sidebar's Contact Support button sends email.</span>
            </label>
          </div>
        </section>

        {/* Inventory Alerts */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">Inventory Alerts</h2>

          <div className="mt-6 space-y-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.lowStockAlerts}
                onChange={(e) => set("lowStockAlerts", e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-gray-700">Enable low-stock alerts (the bell in the top bar)</span>
            </label>

            <div>
              <label htmlFor="threshold" className="mb-2 block text-sm font-medium text-gray-700">
                Default low-stock threshold
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="threshold"
                  type="number"
                  min={0}
                  step={1}
                  value={form.lowStockThreshold}
                  onChange={(e) => set("lowStockThreshold", Number(e.target.value))}
                  className="w-24 rounded-lg border border-gray-300 px-4 py-2.5"
                />
                <span className="text-sm text-gray-500">units — used for items without their own reorder point (0 = only flag items that are out)</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Categories */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
              <button
                onClick={() => setAddingCategory((v) => !v)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                + Add Category
              </button>
            </div>

            {addingCategory && (
              <div className="mt-4 flex gap-2">
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void addCategory()}
                  placeholder="Category name"
                  aria-label="New category name"
                  autoFocus
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button onClick={() => void addCategory()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Add
                </button>
              </div>
            )}

            <div className="mt-5 divide-y divide-gray-100">
              {categories.map((category) => (
                <div key={category} className="flex items-center justify-between py-3 text-sm text-gray-700">
                  <span>{category}</span>
                  {!usedCategories.has(category) && (
                    <span className="flex items-center gap-3 text-xs text-gray-400">
                      no items yet
                      <button onClick={() => void removeCategory(category)} className="text-red-500 hover:text-red-700 disabled:hidden">Remove</button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Locations */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Locations</h2>
              <button
                onClick={() => navigate("/locations?new=1")}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                + Add Location
              </button>
            </div>

            <div className="mt-5 divide-y divide-gray-100">
              {locations.map((location) => (
                <div key={location.id} className="py-3 text-sm text-gray-700">
                  {location.name}
                </div>
              ))}
            </div>
          </section>
        </div>

        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-4">
          {status && (
            <span role="status" className={`text-sm ${status.ok ? "text-green-600" : "text-red-600"}`}>{status.text}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

      </div>
    </div>
  );
}
