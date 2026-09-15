import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { inventoryTransactions, stockItems } from "../db/schema.js";
import { BadRequestError, NotFoundError } from "../lib/errors.js";

type Executor = Pick<typeof db, "select">;

// `stock_items.quantity` is the total quantity owned (on-hand + checked out),
// not just what's sitting on the shelf. "Available" is derived from the
// checkout/return ledger in `inventory_transactions` (see src/lib/inventory.ts
// on the frontend). Checkout and return therefore only append transactions;
// only a physical count correction (`adjust`) or a purchase-order receipt
// changes `quantity` itself.
async function getCheckedOutQuantity(tx: Executor, catalogItemId: string, locationId: string): Promise<number> {
  const rows = await tx
    .select({ type: inventoryTransactions.type, quantity: inventoryTransactions.quantity })
    .from(inventoryTransactions)
    .where(and(eq(inventoryTransactions.catalogItemId, catalogItemId), eq(inventoryTransactions.locationId, locationId)));
  let checkedOut = 0;
  for (const row of rows) {
    if (row.type === "checkout") checkedOut += row.quantity;
    if (row.type === "return") checkedOut -= row.quantity;
  }
  return Math.max(0, checkedOut);
}

export async function checkoutStock(
  stockItemId: string,
  quantity: number,
  performedByUserId: string,
  opts: { relatedAssetId?: string; notes?: string } = {}
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
        relatedAssetId: opts.relatedAssetId,
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
  opts: { relatedAssetId?: string; notes?: string } = {}
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
        relatedAssetId: opts.relatedAssetId,
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
