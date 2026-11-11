import { appData as data } from "../data/store";
import { fetchTransactions } from "./api";
import { getPurchaseOrderTotal, listStockItems, purchaseOrderStatusLabels } from "./selectors";

type Cell = string | number | null | undefined;

function toCsv(header: string[], rows: Cell[][]): string {
  const escape = (value: Cell) => {
    const s = value == null ? "" : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
}

function download(filename: string, csv: string) {
  // Leading BOM so Excel opens UTF-8 (e.g. "×", accented names) correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const today = () => new Date().toISOString().slice(0, 10);

function stockRows() {
  return listStockItems().map((row) => {
    const stock = data.stockItems[row.id];
    const catalog = data.catalogItems[stock.catalogItemId];
    return { row, catalog };
  });
}

export function downloadStockOnHand() {
  const rows = stockRows()
    .sort((a, b) => a.row.location.localeCompare(b.row.location) || a.row.name.localeCompare(b.row.name))
    .map(({ row, catalog }) => [
      row.name, row.category, catalog?.type, row.location, row.quantity, row.available, row.inUse,
      row.reorderPoint, row.statusLabel, catalog?.unitPrice, catalog?.unitPrice != null ? catalog.unitPrice * row.quantity : null,
    ]);
  download(
    `stock-on-hand-${today()}.csv`,
    toCsv(["Item", "Category", "Type", "Location", "Total Qty", "Available", "Checked Out", "Reorder Point", "Status", "Unit Price", "Value"], rows)
  );
  return rows.length;
}

export function downloadLowStock() {
  const rows = stockRows()
    .filter(({ row }) => row.status !== "ok")
    .sort((a, b) => a.row.quantity - a.row.reorderPoint - (b.row.quantity - b.row.reorderPoint))
    .map(({ row, catalog }) => [
      row.name, row.category, row.location, row.quantity, row.reorderPoint, row.statusLabel,
      catalog?.vendorId ? data.vendors[catalog.vendorId]?.name : null,
    ]);
  download(`low-stock-${today()}.csv`, toCsv(["Item", "Category", "Location", "On Hand", "Reorder Point", "Status", "Vendor"], rows));
  return rows.length;
}

/** Fetches just the requested date range from the API (the history isn't kept in the browser). */
export async function downloadStockMovement(from?: string, to?: string) {
  const transactions = await fetchTransactions({ from, to });
  const rows = transactions.map((t) => [
      new Date(t.createdAt).toLocaleString("en-US"),
      t.type,
      data.catalogItems[t.catalogItemId]?.name,
      data.locations[t.locationId]?.name,
      t.quantity,
      data.users[t.performedByUserId]?.name,
      t.relatedPurchaseOrderId ? data.purchaseOrders[t.relatedPurchaseOrderId]?.purchaseOrderNumber : null,
      t.notes,
    ]);
  download(
    `stock-movement-${from ?? "start"}-to-${to ?? today()}.csv`,
    toCsv(["Date", "Type", "Item", "Location", "Quantity", "Performed By", "Purchase Order", "Notes"], rows)
  );
  return rows.length;
}

export function downloadPurchaseHistory(from?: string, to?: string) {
  const lines = Object.values(data.purchaseOrderLines);
  const rows = Object.values(data.purchaseOrders)
    .filter((po) => (!from || po.orderDate >= from) && (!to || po.orderDate <= to))
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    .flatMap((po) =>
      lines
        .filter((l) => l.purchaseOrderId === po.id)
        .map((l) => [
          po.purchaseOrderNumber, po.orderDate, data.vendors[po.vendorId]?.name, purchaseOrderStatusLabels[po.status],
          data.catalogItems[l.catalogItemId]?.name, l.quantity, l.receivedQuantity, l.unitPrice, l.quantity * l.unitPrice,
          getPurchaseOrderTotal(po),
        ])
    );
  download(
    `purchase-history-${from ?? "start"}-to-${to ?? today()}.csv`,
    toCsv(["PO Number", "Order Date", "Vendor", "Status", "Item", "Qty Ordered", "Qty Received", "Unit Price", "Line Total", "PO Total"], rows)
  );
  return rows.length;
}
