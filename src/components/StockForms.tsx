import { useMemo, useState } from "react";
import { useData } from "../context/useData";
import { appData } from "../data/store";
import { adjustStock, checkoutStock, createCatalogItem, createStockItem, returnStock } from "../lib/api";
import type { StockRow } from "../lib/selectors";
import { useSettings } from "../lib/settings";
import type { CatalogItemType } from "../types/domain";
import { Field, FormError, Modal, inputClass, primaryButtonClass, secondaryButtonClass } from "./Modal";

const NEW_ITEM = "__new__";

const toOptionalNumber = (s: string) => (s.trim() === "" ? undefined : Number(s));

/** Adds an item to stock at a location: either an existing catalog item or a brand-new one. */
export function AddStockModal({ onClose }: { onClose: () => void }) {
  const { revision, refresh } = useData();
  const settings = useSettings();

  const catalog = useMemo(
    () => Object.values(appData.catalogItems).sort((a, b) => a.name.localeCompare(b.name)),
    [revision]
  );
  const locations = useMemo(() => Object.values(appData.locations).sort((a, b) => a.name.localeCompare(b.name)), [revision]);
  const vendors = useMemo(() => Object.values(appData.vendors).sort((a, b) => a.name.localeCompare(b.name)), [revision]);
  const categories = useMemo(
    () => Array.from(new Set([...catalog.map((c) => c.category), ...settings.extraCategories])).sort(),
    [catalog, settings.extraCategories]
  );

  const [catalogItemId, setCatalogItemId] = useState(NEW_ITEM);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<CatalogItemType>("consumable");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [chosenLocationId, setLocationId] = useState("");
  // Until the user picks one, follow the Settings default (or the first location) - this also
  // fills in once data arrives if the dialog was opened while the app was still loading.
  const locationId =
    chosenLocationId ||
    (locations.some((l) => l.id === settings.defaultLocationId) ? settings.defaultLocationId : locations[0]?.id ?? "");
  const [quantity, setQuantity] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isNew = catalogItemId === NEW_ITEM;

  async function handleSave() {
    setError(null);
    const qty = Number(quantity);
    if (isNew && (!name.trim() || !category.trim())) return setError("Name and category are required.");
    if (!locationId) return setError("Choose a location. Add one on the Locations page first if the list is empty.");
    if (!Number.isInteger(qty) || qty < 0) return setError("Starting quantity must be a whole number, 0 or more.");
    const rp = toOptionalNumber(reorderPoint);
    if (rp !== undefined && (!Number.isInteger(rp) || rp < 0)) return setError("Reorder point must be a whole number, 0 or more.");
    const price = toOptionalNumber(unitPrice);
    if (price !== undefined && (Number.isNaN(price) || price < 0)) return setError("Unit price must be 0 or more.");

    setSaving(true);
    try {
      let itemId = catalogItemId;
      if (isNew) {
        const created = await createCatalogItem({
          name: name.trim(),
          category: category.trim(),
          type,
          manufacturer: manufacturer.trim() || undefined,
          model: model.trim() || undefined,
          vendorId: vendorId || undefined,
          unitPrice: price,
          reorderPoint: rp,
        });
        itemId = created.id;
        // If adding the stock line fails below, a retry must reuse this item rather than create a duplicate.
        setCatalogItemId(itemId);
      }
      await createStockItem({ catalogItemId: itemId, locationId, quantity: qty, reorderPoint: isNew ? undefined : rp });
      onClose();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add the item.");
      if (isNew) await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add Inventory Item"
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose} className={secondaryButtonClass}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving..." : "Add to Inventory"}
          </button>
        </>
      }
    >
      <FormError message={error} />
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Item">
            <select value={catalogItemId} onChange={(e) => setCatalogItemId(e.target.value)} className={inputClass}>
              <option value={NEW_ITEM}>+ New item (not in the catalog yet)</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.category}</option>
              ))}
            </select>
          </Field>
        </div>

        {isNew && (
          <>
            <Field label="Name *">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. USB-C to HDMI Adapter" />
            </Field>
            <Field label="Category *">
              <input value={category} onChange={(e) => setCategory(e.target.value)} list="category-options" className={inputClass} placeholder="e.g. Accessories" />
              <datalist id="category-options">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="Type" hint="Consumables also appear on the Consumables page.">
              <select value={type} onChange={(e) => setType(e.target.value as CatalogItemType)} className={inputClass}>
                <option value="consumable">Consumable</option>
                <option value="accessory">Accessory</option>
              </select>
            </Field>
            <Field label="Vendor">
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClass}>
                <option value="">None</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="Manufacturer">
              <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Model">
              <input value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Unit price">
              <input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={inputClass} />
            </Field>
          </>
        )}

        <Field label="Reorder point" hint="Flag as low stock at or below this many units.">
          <input type="number" min={0} step={1} value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Location *">
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputClass}>
            {locations.length === 0 && <option value="">No locations yet</option>}
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Starting quantity">
          <input type="number" min={0} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
}

export type StockAction = "checkout" | "return" | "adjust";

const actionCopy: Record<StockAction, { title: string; button: string; qtyLabel: string }> = {
  checkout: { title: "Check Out", button: "Check Out", qtyLabel: "Quantity to check out" },
  return: { title: "Return", button: "Return", qtyLabel: "Quantity to return" },
  adjust: { title: "Adjust Quantity", button: "Save Count", qtyLabel: "New total quantity (physical count)" },
};

/** Check out, return, or recount one stock line. */
export function StockActionModal({ row, action, onClose }: { row: StockRow; action: StockAction; onClose: () => void }) {
  const { refresh } = useData();
  const copy = actionCopy[action];
  const [quantity, setQuantity] = useState(action === "adjust" ? String(row.quantity) : "1");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const limit = action === "checkout" ? row.available : action === "return" ? row.inUse : undefined;

  async function handleSave() {
    setError(null);
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < (action === "adjust" ? 0 : 1)) {
      return setError(action === "adjust" ? "Enter a whole number, 0 or more." : "Enter a whole number, 1 or more.");
    }
    setSaving(true);
    try {
      const n = notes.trim() || undefined;
      if (action === "checkout") await checkoutStock(row.id, qty, n);
      else if (action === "return") await returnStock(row.id, qty, n);
      else await adjustStock(row.id, qty, n);
      onClose();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`${copy.title}: ${row.name}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={secondaryButtonClass}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving..." : copy.button}
          </button>
        </>
      }
    >
      <FormError message={error} />
      <p className="mb-4 text-sm text-gray-500">
        {row.location} · {row.quantity} total · {row.available} available · {row.inUse} checked out
      </p>
      <div className="space-y-4">
        <Field label={copy.qtyLabel} hint={limit !== undefined ? `Up to ${limit}.` : undefined}>
          <input
            type="number"
            min={action === "adjust" ? 0 : 1}
            max={limit}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
            autoFocus
          />
        </Field>
        <Field label="Notes">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            placeholder={action === "checkout" ? "e.g. Issued to J. Smith, desk 4B" : "Optional"}
          />
        </Field>
      </div>
    </Modal>
  );
}
