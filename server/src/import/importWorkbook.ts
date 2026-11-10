import XLSX from "xlsx";
import { sql } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import {
  catalogItems,
  departments,
  inventoryTransactions,
  locations,
  stockItems,
  users,
  vendors,
} from "../db/schema.js";

interface ImportRow {
  rowNumber: number;
  sourceId?: string;
  itemName: string;
  category: string;
  itemType?: string;
  quantity: number;
  location: string;
  vendor?: string;
  reorderPoint?: number;
  notes?: string;
}

export interface ImportOptions {
  filePath: string;
  sheetName?: string;
  replace: boolean;
  dryRun: boolean;
}

export interface ImportSummary {
  rows: number;
  /** Rows with an asset tag or serial number: individually tracked assets are out of scope, so they are not imported. */
  skippedSerializedRows: number;
  stockItems: number;
  locations: number;
  vendors: number;
  catalogItems: number;
  errors: string[];
}

const serializedHeaders = ["asset tag", "tag", "inventory number", "inventory tag", "serial number", "serial", "s/n", "sn"];

const aliases: Record<keyof Omit<ImportRow, "rowNumber" | "quantity" | "reorderPoint">, string[]> = {
  sourceId: ["assetid", "asset id", "source id", "inventory id"],
  itemName: ["item name", "product", "description", "model", "item"],
  category: ["category", "asset type", "group"],
  itemType: ["item type", "catalog type", "record type"],
  location: ["location", "site", "office", "storage location"],
  vendor: ["vendor", "supplier", "manufacturer"],
  notes: ["notes", "comments", "comment"],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function text(value: unknown): string | undefined {
  const result = String(value ?? "").trim();
  return result || undefined;
}

function numberValue(value: unknown, fallback?: number): number | undefined {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const normalized = String(value).replace(/,/g, "").trim();
  const parsed = Number(normalized) || Number(normalized.match(/^\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inferCategory(itemName: string): string {
  const name = itemName.toLowerCase();
  if (/toner|cartridge|ink|drum|label/.test(name)) return "Printer Supplies";
  if (/laptop|desktop|computer|switch|polycom|webcam|monitor/.test(name)) return "Hardware";
  if (/keyboard|mouse|cable|adapter|cord|headset|dock|mount|stand|backpack/.test(name)) return "Accessories";
  return "Other";
}

function valueFor(raw: Record<string, unknown>, headers: Record<string, string>, names: string[]): unknown {
  const header = Object.entries(headers).find(([, normalized]) => names.includes(normalized))?.[0];
  return header ? raw[header] : undefined;
}

function parseRows(filePath: string, sheetName?: string): { rows: ImportRow[]; skippedSerializedRows: number; errors: string[] } {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const selectedSheet = sheetName ?? workbook.SheetNames[0];
  if (!selectedSheet || !workbook.Sheets[selectedSheet]) {
    return { rows: [], skippedSerializedRows: 0, errors: [`Worksheet not found: ${sheetName ?? "first worksheet"}`] };
  }
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[selectedSheet], { defval: "" });
  const errors: string[] = [];
  const rows: ImportRow[] = [];
  let skippedSerializedRows = 0;
  if (rawRows.length === 0) return { rows, skippedSerializedRows, errors: ["The selected worksheet contains no data rows."] };

  const headers = Object.fromEntries(Object.keys(rawRows[0]).map((header) => [header, normalizeHeader(header)]));
  const quantityHeaders = ["quantity", "qty", "count", "on hand", "onhand", "stock"];
  const reorderHeaders = ["reorder point", "min stock", "minimum", "minimum stock"];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    if (text(valueFor(raw, headers, serializedHeaders))) {
      skippedSerializedRows++;
      return;
    }
    const itemName = text(valueFor(raw, headers, aliases.itemName));
    const category = text(valueFor(raw, headers, aliases.category)) ?? (itemName ? inferCategory(itemName) : undefined);
    const location = text(valueFor(raw, headers, aliases.location));
    const quantity = numberValue(valueFor(raw, headers, quantityHeaders));
    const reorderPoint = numberValue(valueFor(raw, headers, reorderHeaders));
    const rowErrors: string[] = [];
    if (!itemName) rowErrors.push("item name is required");
    if (!category) rowErrors.push("category is required");
    if (!location) rowErrors.push("location is required");
    if (quantity === undefined || !Number.isInteger(quantity) || quantity < 0) rowErrors.push("quantity must be a whole number >= 0");
    if (reorderPoint !== undefined && (!Number.isInteger(reorderPoint) || reorderPoint < 0)) rowErrors.push("reorder point must be a whole number >= 0");
    if (rowErrors.length) {
      errors.push(`Row ${rowNumber}: ${rowErrors.join(", ")}`);
      return;
    }
    rows.push({
      rowNumber,
      sourceId: text(valueFor(raw, headers, aliases.sourceId)),
      itemName: itemName!,
      category: category!,
      itemType: text(valueFor(raw, headers, aliases.itemType)),
      quantity: quantity!,
      location: location!,
      vendor: text(valueFor(raw, headers, aliases.vendor)),
      reorderPoint,
      notes: text(valueFor(raw, headers, aliases.notes)),
    });
  });
  return { rows, skippedSerializedRows, errors };
}

function key(value: string): string {
  return value.trim().toLowerCase();
}

function catalogType(row: ImportRow): "consumable" | "accessory" {
  return key(row.itemType ?? "") === "accessory" ? "accessory" : "consumable";
}

export function previewWorkbook(options: Pick<ImportOptions, "filePath" | "sheetName">): ImportSummary {
  const parsed = parseRows(options.filePath, options.sheetName);
  return {
    rows: parsed.rows.length,
    skippedSerializedRows: parsed.skippedSerializedRows,
    stockItems: new Set(parsed.rows.map((row) => `${key(row.itemName)}|${key(row.category)}|${key(row.location)}`)).size,
    locations: new Set(parsed.rows.map((row) => key(row.location))).size,
    vendors: new Set(parsed.rows.map((row) => key(row.vendor ?? "")).filter(Boolean)).size,
    catalogItems: new Set(parsed.rows.map((row) => `${key(row.itemName)}|${key(row.category)}`)).size,
    errors: parsed.errors,
  };
}

export async function importWorkbook(options: ImportOptions): Promise<ImportSummary> {
  const parsed = parseRows(options.filePath, options.sheetName);
  const summary = previewWorkbook(options);
  if (parsed.errors.length || options.dryRun) return summary;
  if (!options.replace) throw new Error("Importing real data requires --replace. Run with --dry-run first.");

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      TRUNCATE TABLE
        inventory_transactions, stock_items,
        purchase_order_lines, purchase_orders, catalog_items,
        vendors, locations, users, departments
      RESTART IDENTITY CASCADE
    `);

    const importerDepartment = (await tx.insert(departments).values({ name: "Imported" }).returning())[0];
    const importer = (await tx.insert(users).values({
      name: "Data Importer",
      email: "data-importer@local.invalid",
      role: "IT Administrator",
      departmentId: importerDepartment.id,
    }).returning())[0];
    const locationIds = new Map<string, string>();
    const vendorIds = new Map<string, string>();
    const catalogIds = new Map<string, string>();
    const stockTotals = new Map<string, { catalogItemId: string; locationId: string; quantity: number; reorderPoint?: number; sourceIds: string[] }>();

    for (const row of parsed.rows) {
      const locationKey = key(row.location);
      let locationId = locationIds.get(locationKey);
      if (!locationId) {
        locationId = (await tx.insert(locations).values({ name: row.location, type: "office" }).returning())[0].id;
        locationIds.set(locationKey, locationId);
      }

      let vendorId: string | undefined;
      if (row.vendor) {
        const vendorKey = key(row.vendor);
        vendorId = vendorIds.get(vendorKey);
        if (!vendorId) {
          vendorId = (await tx.insert(vendors).values({ name: row.vendor, category: "other" }).returning())[0].id;
          vendorIds.set(vendorKey, vendorId);
        }
      }

      const catalogKey = `${key(row.itemName)}|${key(row.category)}`;
      let catalogItemId = catalogIds.get(catalogKey);
      if (!catalogItemId) {
        catalogItemId = (await tx.insert(catalogItems).values({
          name: row.itemName,
          category: row.category,
          type: catalogType(row),
          vendorId,
          reorderPoint: row.reorderPoint,
        }).returning())[0].id;
        catalogIds.set(catalogKey, catalogItemId);
      }

      const stockKey = `${catalogItemId}|${locationId}`;
      const existing = stockTotals.get(stockKey);
      if (existing) {
        existing.quantity += row.quantity;
        if (row.sourceId) existing.sourceIds.push(row.sourceId);
      } else {
        stockTotals.set(stockKey, {
          catalogItemId,
          locationId,
          quantity: row.quantity,
          reorderPoint: row.reorderPoint,
          sourceIds: row.sourceId ? [row.sourceId] : [],
        });
      }
    }

    for (const stock of stockTotals.values()) {
      const { sourceIds, ...stockItemValues } = stock;
      await tx.insert(stockItems).values(stockItemValues).returning();
      if (stock.quantity > 0) {
        await tx.insert(inventoryTransactions).values({
          catalogItemId: stock.catalogItemId,
          locationId: stock.locationId,
          type: "receipt",
          quantity: stock.quantity,
          performedByUserId: importer.id,
          notes: ["Initial Excel import receipt", sourceIds.length ? `Source AssetID(s): ${sourceIds.join(", ")}` : undefined]
            .filter(Boolean)
            .join(" | "),
        });
      }
    }
  });
  return summary;
}

async function main() {
  const [filePath, ...args] = process.argv.slice(2);
  const sheetIndex = args.indexOf("--sheet");
  const sheetName = sheetIndex >= 0 ? args[sheetIndex + 1] : undefined;
  const dryRun = args.includes("--dry-run");
  const replace = args.includes("--replace");
  if (!filePath || (!dryRun && !replace)) {
    console.error("Usage: npm run db:import -- <file.xlsx> [--sheet <name>] [--dry-run | --replace]");
    process.exit(1);
  }
  const summary = await importWorkbook({ filePath, sheetName, dryRun, replace });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors.length) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("importWorkbook.ts")) {
  main().catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await pool.end();
    process.exit(1);
  });
}
