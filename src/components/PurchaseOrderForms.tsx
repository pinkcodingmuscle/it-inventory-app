import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useData } from "../context/useData";
import { appData } from "../data/store";
import { createPurchaseOrder, receivePurchaseOrder } from "../lib/api";
import { useSettings } from "../lib/settings";
import { Field, FormError, Modal, inputBase, inputClass, primaryButtonClass, secondaryButtonClass } from "./Modal";

interface DraftLine {
  key: number;
  catalogItemId: string;
  quantity: string;
  unitPrice: string;
}

function suggestPoNumber(): string {
  const year = new Date().getFullYear();
  const taken = new Set(Object.values(appData.purchaseOrders).map((po) => po.purchaseOrderNumber));
  for (let n = taken.size + 1; ; n++) {
    const candidate = `PO-${year}-${String(n).padStart(3, "0")}`;
    if (!taken.has(candidate)) return candidate;
  }
}

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function NewPurchaseOrderModal({ onClose }: { onClose: () => void }) {
  const { revision, refresh } = useData();
  const vendors = useMemo(() => Object.values(appData.vendors).sort((a, b) => a.name.localeCompare(b.name)), [revision]);
  const catalog = useMemo(() => Object.values(appData.catalogItems).sort((a, b) => a.name.localeCompare(b.name)), [revision]);

  const [typedPoNumber, setPoNumber] = useState<string | null>(null);
  // Until the user edits it, follow the suggestion - which updates once data has loaded.
  const suggestedPoNumber = useMemo(() => suggestPoNumber(), [revision]);
  const poNumber = typedPoNumber ?? suggestedPoNumber;
  const [vendorId, setVendorId] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ key: 0, catalogItemId: "", quantity: "1", unitPrice: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveVendorId = vendorId || vendors[0]?.id || "";

  const updateLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function pickItem(key: number, catalogItemId: string) {
    const price = appData.catalogItems[catalogItemId]?.unitPrice;
    updateLine(key, { catalogItemId, ...(price != null ? { unitPrice: String(price) } : {}) });
  }

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  async function handleSave() {
    setError(null);
    if (!poNumber.trim()) return setError("PO number is required.");
    if (!effectiveVendorId) return setError("Choose a vendor.");
    const filled = lines.filter((l) => l.catalogItemId);
    if (filled.length === 0) return setError("Add at least one item.");
    for (const l of filled) {
      const q = Number(l.quantity);
      const p = Number(l.unitPrice);
      if (!Number.isInteger(q) || q < 1) return setError("Each quantity must be a whole number, 1 or more.");
      if (l.unitPrice.trim() === "" || Number.isNaN(p) || p < 0) return setError("Each item needs a unit price (0 or more).");
    }
    setSaving(true);
    try {
      await createPurchaseOrder({
        purchaseOrderNumber: poNumber.trim(),
        vendorId: effectiveVendorId,
        orderDate,
        notes: notes.trim() || undefined,
        lines: filled.map((l) => ({ catalogItemId: l.catalogItemId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
      });
      onClose();
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create the purchase order.";
      setError(/unique/i.test(message) ? "That PO number is already used. Choose another." : message);
    } finally {
      setSaving(false);
    }
  }

  if (vendors.length === 0) {
    return (
      <Modal title="New Purchase Order" onClose={onClose} footer={<button onClick={onClose} className={secondaryButtonClass}>Close</button>}>
        <p className="text-sm text-gray-600">
          A purchase order needs a vendor, and there are none yet.{" "}
          <Link to="/vendors" onClick={onClose} className="font-medium text-blue-600 hover:underline">Add a vendor first</Link>.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      title="New Purchase Order"
      onClose={onClose}
      wide
      footer={
        <>
          <span className="mr-auto self-center text-sm text-gray-600">Total: <strong>{money(total)}</strong></span>
          <button onClick={onClose} className={secondaryButtonClass}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving..." : "Create Purchase Order"}
          </button>
        </>
      }
    >
      <FormError message={error} />
      <div className="grid grid-cols-3 gap-4">
        <Field label="PO number *">
          <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Vendor *">
          <select value={effectiveVendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClass}>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
        <Field label="Order date">
          <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-gray-600">Items *</p>
        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.key} className="flex items-center gap-2">
              <select
                value={line.catalogItemId}
                onChange={(e) => pickItem(line.key, e.target.value)}
                aria-label="Item"
                className={`${inputBase} min-w-0 flex-1`}
              >
                <option value="">Choose an item…</option>
                {catalog.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                type="number" min={1} step={1} value={line.quantity} aria-label="Quantity"
                onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                className={`${inputBase} w-20`}
              />
              <input
                type="number" min={0} step="0.01" value={line.unitPrice} aria-label="Unit price" placeholder="Unit price"
                onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                className={`${inputBase} w-28`}
              />
              <button
                onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                disabled={lines.length === 1}
                aria-label="Remove line"
                className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setLines((ls) => [...ls, { key: Math.max(...ls.map((l) => l.key)) + 1, catalogItemId: "", quantity: "1", unitPrice: "" }])}
          className="mt-2 text-sm font-medium text-blue-600 hover:underline"
        >
          + Add another item
        </button>
        <p className="mt-2 text-[11px] text-gray-400">
          Item not listed? Add it on the Inventory page first (Add Item, starting quantity 0).
        </p>
      </div>

      <div className="mt-5">
        <Field label="Notes">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Optional" />
        </Field>
      </div>
    </Modal>
  );
}

/** Receive the outstanding quantities of an open purchase order into one location. */
export function ReceivePurchaseOrderModal({ purchaseOrderId, onClose }: { purchaseOrderId: string; onClose: () => void }) {
  const { revision, refresh } = useData();
  const settings = useSettings();
  const po = appData.purchaseOrders[purchaseOrderId];
  const lines = useMemo(
    () => Object.values(appData.purchaseOrderLines).filter((l) => l.purchaseOrderId === purchaseOrderId && l.receivedQuantity < l.quantity),
    [purchaseOrderId, revision]
  );
  const locations = useMemo(() => Object.values(appData.locations).sort((a, b) => a.name.localeCompare(b.name)), [revision]);

  const [chosenLocationId, setLocationId] = useState("");
  const locationId =
    chosenLocationId ||
    (locations.some((l) => l.id === settings.defaultLocationId) ? settings.defaultLocationId : locations[0]?.id ?? "");
  const [qty, setQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(lines.map((l) => [l.id, String(l.quantity - l.receivedQuantity)]))
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    if (!locationId) return setError("Choose where the items are being stored.");
    const receipts = [];
    for (const l of lines) {
      const raw = qty[l.id] ?? "0";
      const n = Number(raw);
      const remaining = l.quantity - l.receivedQuantity;
      if (!Number.isInteger(n) || n < 0 || n > remaining) {
        return setError(`Quantities must be whole numbers between 0 and what's still on order.`);
      }
      if (n > 0) receipts.push({ lineId: l.id, quantity: n });
    }
    if (receipts.length === 0) return setError("Enter a quantity for at least one item.");
    setSaving(true);
    try {
      await receivePurchaseOrder(purchaseOrderId, locationId, receipts);
      onClose();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive the order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Receive ${po?.purchaseOrderNumber ?? "Purchase Order"}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={secondaryButtonClass}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving..." : "Receive Items"}
          </button>
        </>
      }
    >
      <FormError message={error} />
      <div className="mb-4">
        <Field label="Store received items at">
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputClass}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs font-medium uppercase text-gray-500">
          <tr>
            <th className="py-2 text-left">Item</th>
            <th className="py-2 text-left">Still on order</th>
            <th className="py-2 text-left">Receiving now</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {lines.map((l) => (
            <tr key={l.id}>
              <td className="py-2 pr-2 text-gray-800">{appData.catalogItems[l.catalogItemId]?.name ?? "Unknown item"}</td>
              <td className="py-2 text-gray-600">{l.quantity - l.receivedQuantity} of {l.quantity}</td>
              <td className="py-2">
                <input
                  type="number" min={0} max={l.quantity - l.receivedQuantity} step={1}
                  value={qty[l.id] ?? ""} aria-label="Receiving now"
                  onChange={(e) => setQty((q) => ({ ...q, [l.id]: e.target.value }))}
                  className={`${inputBase} w-24`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
