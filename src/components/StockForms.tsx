import { useEffect, useState } from "react";
import { useData } from "../context/useData";
import { appData } from "../data/store";
import {
  adjustStock,
  checkoutStock,
  createCatalogItem,
  createStockItem,
  deleteStockItem,
  fetchTransactions,
  returnStock,
  updateCatalogItem,
  updateStockItem,
} from "../lib/api";
import type { StockRow } from "../lib/selectors";
import { useSettings } from "../lib/settings";
import type { CatalogItemType, InventoryTransaction } from "../types/domain";
import { Field, FormError, Modal, inputClass, primaryButtonClass, secondaryButtonClass } from "./Modal";

const NEW_ITEM = "__new__";

const toOptionalNumber = (s: string) => (s.trim() === "" ? undefined : Number(s));

const sortedByName = <T extends { name: string }>(records: Record<string, T>) =>
  Object.values(records).sort((a, b) => a.name.localeCompare(b.name));

/** Categories in use plus those added in Settings. */
const allCategories = (extra: string[]) =>
  Array.from(new Set([...Object.values(appData.catalogItems).map((c) => c.category), ...extra])).sort();

/** Adds an item to stock at a location: either an existing catalog item or a brand-new one. */
export function AddStockModal({ onClose }: { onClose: () => void }) {
  const { refresh } = useData();
  const settings = useSettings();

  const catalog = sortedByName(appData.catalogItems);
  const locations = sortedByName(appData.locations);
  const vendors = sortedByName(appData.vendors);
  const categories = allCategories(settings.extraCategories);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
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
            <Field label="Type" hint="Consumables get used up (toner, cables); accessories are reissued.">
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

/**
 * Edit a stock line: the catalog item's details (shared by every location that
 * stocks it) and this location's own reorder point. Also removes the line.
 */
export function EditStockModal({ row, onClose }: { row: StockRow; onClose: () => void }) {
  const { refresh } = useData();
  const settings = useSettings();
  const stock = appData.stockItems[row.id];
  const item = appData.catalogItems[row.catalogItemId];
  const vendors = sortedByName(appData.vendors);
  const categories = allCategories(settings.extraCategories);
  const otherLocations = Object.values(appData.stockItems).filter((s) => s.catalogItemId === row.catalogItemId && s.id !== row.id).length;

  const str = (v: number | string | null | undefined) => (v == null ? "" : String(v));
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [type, setType] = useState<CatalogItemType>(item?.type ?? "consumable");
  const [manufacturer, setManufacturer] = useState(item?.manufacturer ?? "");
  const [model, setModel] = useState(item?.model ?? "");
  const [vendorId, setVendorId] = useState(item?.vendorId ?? "");
  const [unitPrice, setUnitPrice] = useState(str(item?.unitPrice));
  const [itemReorder, setItemReorder] = useState(str(item?.reorderPoint));
  const [lineReorder, setLineReorder] = useState(str(stock?.reorderPoint));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const wholeOrEmpty = (v: string) => v.trim() === "" || (Number.isInteger(Number(v)) && Number(v) >= 0);
  const orNull = (v: string) => (v.trim() === "" ? null : v.trim());
  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  async function handleSave() {
    setError(null);
    if (!name.trim() || !category.trim()) return setError("Name and category are required.");
    if (!wholeOrEmpty(itemReorder) || !wholeOrEmpty(lineReorder)) return setError("Reorder points must be whole numbers, 0 or more.");
    if (unitPrice.trim() && (Number.isNaN(Number(unitPrice)) || Number(unitPrice) < 0)) return setError("Unit price must be 0 or more.");
    setSaving(true);
    try {
      await updateCatalogItem(row.catalogItemId, {
        name: name.trim(),
        category: category.trim(),
        type,
        manufacturer: orNull(manufacturer),
        model: orNull(model),
        vendorId: vendorId || null,
        unitPrice: numOrNull(unitPrice),
        reorderPoint: numOrNull(itemReorder),
      });
      if (numOrNull(lineReorder) !== (stock?.reorderPoint ?? null)) {
        await updateStockItem(row.id, { reorderPoint: numOrNull(lineReorder) });
      }
      onClose();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setSaving(true);
    try {
      // The catalog item itself is kept (with its history), so it can still be
      // re-added from Add Item or ordered on a purchase order.
      await deleteStockItem(row.id);
      onClose();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove the item.");
      setConfirmingRemove(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Edit ${row.name}`}
      onClose={onClose}
      wide
      footer={
        confirmingRemove ? (
          <>
            <span className="mr-auto self-center text-sm text-gray-700">Remove {row.name} from {row.location}? Its history is kept.</span>
            <button onClick={() => setConfirmingRemove(false)} className={secondaryButtonClass}>Keep</button>
            <button onClick={handleRemove} disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? "Removing..." : "Remove"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirmingRemove(true)}
              disabled={row.quantity !== 0}
              title={row.quantity !== 0 ? "Recount this item to 0 first" : undefined}
              className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove from {row.location}
            </button>
            <button onClick={onClose} className={secondaryButtonClass}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>{saving ? "Saving..." : "Save"}</button>
          </>
        )
      }
    >
      <FormError message={error} />
      <p className="mb-4 text-xs text-gray-500">
        Item details apply {otherLocations > 0 ? `here and at ${otherLocations} other location${otherLocations === 1 ? "" : "s"}` : "to this item"}.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Category *">
          <input value={category} onChange={(e) => setCategory(e.target.value)} list="edit-category-options" className={inputClass} />
          <datalist id="edit-category-options">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Type">
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
        <Field label="Unit price" hint="Used for the inventory value and new purchase orders.">
          <input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={inputClass} placeholder="Not set" />
        </Field>
        <Field label="Reorder point (all locations)" hint={`Empty = the Settings default (${settings.lowStockThreshold}).`}>
          <input type="number" min={0} step={1} value={itemReorder} onChange={(e) => setItemReorder(e.target.value)} className={inputClass} />
        </Field>
        <Field label={`Reorder point at ${row.location}`} hint="Overrides the one above for this location only. Empty = use it.">
          <input type="number" min={0} step={1} value={lineReorder} onChange={(e) => setLineReorder(e.target.value)} className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
}

const transactionLabels: Record<InventoryTransaction["type"], { label: string; style: string }> = {
  checkout: { label: "Checked out", style: "bg-blue-100 text-blue-700" },
  return: { label: "Returned", style: "bg-green-100 text-green-700" },
  adjustment: { label: "Adjustment", style: "bg-gray-100 text-gray-600" },
  receipt: { label: "Received", style: "bg-indigo-100 text-indigo-700" },
  purchase: { label: "Purchased", style: "bg-indigo-100 text-indigo-700" },
  disposal: { label: "Disposed", style: "bg-red-100 text-red-700" },
};

/** Every movement of one item at one location, newest first. */
export function StockHistoryModal({ row, onClose }: { row: StockRow; onClose: () => void }) {
  const [state, setState] = useState<{ rows?: InventoryTransaction[]; error?: string }>({});

  useEffect(() => {
    let cancelled = false;
    fetchTransactions({ catalogItemId: row.catalogItemId, locationId: row.locationId, limit: 500 })
      .then((rows) => !cancelled && setState({ rows }))
      .catch((err) => !cancelled && setState({ error: err instanceof Error ? err.message : "Couldn't load the history." }));
    return () => {
      cancelled = true;
    };
  }, [row.catalogItemId, row.locationId]);

  return (
    <Modal title={`History: ${row.name}`} onClose={onClose} wide footer={<button onClick={onClose} className={secondaryButtonClass}>Close</button>}>
      <p className="mb-4 text-sm text-gray-500">
        {row.location} · {row.quantity} total · {row.available} available · {row.inUse} checked out
      </p>
      <FormError message={state.error ?? null} />
      {!state.rows && !state.error && <p className="py-6 text-center text-sm text-gray-400">Loading…</p>}
      {state.rows?.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No movements recorded yet.</p>}
      {state.rows && state.rows.length > 0 && (
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">What</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">By</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.rows.map((t) => {
                const kind = transactionLabels[t.type];
                return (
                  <tr key={t.id} className="align-top">
                    <td className="whitespace-nowrap py-2 pr-3 text-gray-600">
                      {new Date(t.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kind.style}`}>{kind.label}</span>
                      {t.relatedPurchaseOrderId && (
                        <span className="ml-1 text-xs text-gray-500">{appData.purchaseOrders[t.relatedPurchaseOrderId]?.purchaseOrderNumber}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-medium text-gray-900">{t.quantity}</td>
                    <td className="py-2 pr-3 text-gray-600">{appData.users[t.performedByUserId]?.name ?? "—"}</td>
                    <td className="py-2 text-gray-500">{t.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

