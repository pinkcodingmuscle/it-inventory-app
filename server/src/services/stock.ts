import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { inventoryTransactions, stockItems } from "../db/schema.js";
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors.js";

type Executor = Pick<typeof db, "select">;

// `stock_items.quantity` is the total quantity owned (on-hand + checked out),
// not just what's sitting on the shelf. "Available" is derived from the
// checkout/return ledger in `inventory_transactions`; GET /api/stock returns
// it per line as `checkedOut`. Checkout and return therefore only append transactions;
// only a physical count correction (`adjust`) or a purchase-order receipt
// changes `quantity` itself.
// Net units checked out = sum(checkout) - sum(return), summed in the database
// rather than by loading every transaction row.
const checkedOutExpr = sql<number>`greatest(0, coalesce(sum(case
  when ${inventoryTransactions.type} = 'checkout' then ${inventoryTransactions.quantity}
  when ${inventoryTransactions.type} = 'return' then -${inventoryTransactions.quantity}
  else 0 end), 0))::int`;

async function getCheckedOutQuantity(tx: Executor, catalogItemId: string, locationId: string): Promise<number> {
  const [row] = await tx
    .select({ checkedOut: checkedOutExpr })
    .from(inventoryTransactions)
    .where(and(eq(inventoryTransactions.catalogItemId, catalogItemId), eq(inventoryTransactions.locationId, locationId)));
  return Number(row?.checkedOut ?? 0);
}

/** Every stock line with how many of its units are currently checked out. */
export async function listStockWithCheckedOut() {
  const [rows, totals] = await Promise.all([
    db.select().from(stockItems),
    db
      .select({
        catalogItemId: inventoryTransactions.catalogItemId,
        locationId: inventoryTransactions.locationId,
        checkedOut: checkedOutExpr,
      })
      .from(inventoryTransactions)
      .where(inArray(inventoryTransactions.type, ["checkout", "return"]))
      .groupBy(inventoryTransactions.catalogItemId, inventoryTransactions.locationId),
  ]);
  const byKey = new Map(totals.map((t) => [`${t.catalogItemId}|${t.locationId}`, Number(t.checkedOut)]));
  return rows.map((row) => ({ ...row, checkedOut: byKey.get(`${row.catalogItemId}|${row.locationId}`) ?? 0 }));
}

/** Changes a stock line's own reorder point (null = use the catalog item's / the default). */
export async function updateStockItem(stockItemId: string, input: { reorderPoint?: number | null }) {
  const [row] = await db
    .update(stockItems)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(stockItems.id, stockItemId))
    .returning();
  if (!row) throw new NotFoundError("Stock item not found");
  return row;
}

/**
 * Stops tracking an item at a location. Only allowed once its quantity is 0;
 * its transaction history is kept (it references the catalog item and location).
 */
export async function deleteStockItem(stockItemId: string) {
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(stockItems).where(eq(stockItems.id, stockItemId)).for("update");
    if (!item) throw new NotFoundError("Stock item not found");
    if (item.quantity !== 0) {
      throw new ConflictError("Recount this item to 0 before removing it from this location.");
    }
    await tx.delete(stockItems).where(eq(stockItems.id, stockItemId));
  });
}

/**
 * Starts tracking a catalog item at a location. A non-zero starting quantity
 * is recorded as an adjustment so the ledger explains where the units came from.
 */
export async function createStockItem(
  input: { catalogItemId: string; locationId: string; quantity: number; reorderPoint?: number; notes?: string },
  performedByUserId: string
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: stockItems.id })
      .from(stockItems)
      .where(and(eq(stockItems.catalogItemId, input.catalogItemId), eq(stockItems.locationId, input.locationId)));
    if (existing) {
      throw new ConflictError("This item is already stocked at that location. Adjust its quantity instead.");
    }

    const [item] = await tx
      .insert(stockItems)
      .values({
        catalogItemId: input.catalogItemId,
        locationId: input.locationId,
        quantity: input.quantity,
        reorderPoint: input.reorderPoint,
      })
      .returning();

    const [txn] =
      input.quantity > 0
        ? await tx
            .insert(inventoryTransactions)
            .values({
              catalogItemId: input.catalogItemId,
              locationId: input.locationId,
              type: "adjustment",
              quantity: input.quantity,
              performedByUserId,
              notes: input.notes ?? "Initial stock",
            })
            .returning()
        : [];

    return { stockItem: item, transaction: txn ?? null };
  });
}

export async function checkoutStock(
  stockItemId: string,
  quantity: number,
  performedByUserId: string,
  opts: { notes?: string } = {}
) {
  if (quantity <= 0) throw new BadRequestError("Checkout quantity must be greater than zero.");

  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(stockItems).where(eq(stockItems.id, stockItemId)).for("update");
    if (!item) throw new NotFoundError("Stock item not found");

    const checkedOut = await getCheckedOutQuantity(tx, item.catalogItemId, item.locationId);
    const available = Math.max(0, item.quantity - checkedOut);
    if (quantity > available) {
      throw new BadRequestError(`Only ${available} unit(s) available to check out.`);
    }

    const [txn] = await tx
      .insert(inventoryTransactions)
      .values({
        catalogItemId: item.catalogItemId,
        locationId: item.locationId,
        type: "checkout",
        quantity,
        performedByUserId,
        notes: opts.notes,
      })
      .returning();

    return { stockItem: item, transaction: txn };
  });
}

export async function returnStock(
  stockItemId: string,
  quantity: number,
  performedByUserId: string,
  opts: { notes?: string } = {}
) {
  if (quantity <= 0) throw new BadRequestError("Return quantity must be greater than zero.");

  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(stockItems).where(eq(stockItems.id, stockItemId)).for("update");
    if (!item) throw new NotFoundError("Stock item not found");

    const checkedOut = await getCheckedOutQuantity(tx, item.catalogItemId, item.locationId);
    if (quantity > checkedOut) {
      throw new BadRequestError(`Only ${checkedOut} unit(s) are currently checked out.`);
    }

    const [txn] = await tx
      .insert(inventoryTransactions)
      .values({
        catalogItemId: item.catalogItemId,
        locationId: item.locationId,
        type: "return",
        quantity,
        performedByUserId,
        notes: opts.notes,
      })
      .returning();

    return { stockItem: item, transaction: txn };
  });
}

export async function adjustStock(
  stockItemId: string,
  newQuantity: number,
  performedByUserId: string,
  notes?: string
) {
  if (newQuantity < 0) throw new BadRequestError("Quantity cannot be negative.");

  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(stockItems).where(eq(stockItems.id, stockItemId)).for("update");
    if (!item) throw new NotFoundError("Stock item not found");

    const delta = newQuantity - item.quantity;
    if (delta === 0) throw new BadRequestError("New quantity matches the current quantity; nothing to adjust.");

    const [updated] = await tx
      .update(stockItems)
      .set({ quantity: newQuantity, updatedAt: new Date() })
      .where(eq(stockItems.id, stockItemId))
      .returning();

    const [txn] = await tx
      .insert(inventoryTransactions)
      .values({
        catalogItemId: item.catalogItemId,
        locationId: item.locationId,
        type: "adjustment",
        quantity: Math.abs(delta),
        performedByUserId,
        notes: notes ?? (delta > 0 ? "Adjustment: quantity increased" : "Adjustment: quantity decreased"),
      })
      .returning();

    return { stockItem: updated, transaction: txn };
  });
}
