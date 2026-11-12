import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { catalogItems, inventoryTransactions, purchaseOrderLines, stockItems } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { ConflictError, NotFoundError } from "../lib/errors.js";
import { toNumber } from "../lib/serialize.js";

export const catalogItemsRouter = Router();

function serialize(row: typeof catalogItems.$inferSelect) {
  return { ...row, unitPrice: toNumber(row.unitPrice) };
}

catalogItemsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(catalogItems);
    res.json(rows.map(serialize));
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  type: z.enum(["consumable", "accessory"]),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  vendorId: z.string().uuid().optional(),
  reorderPoint: z.number().int().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
});

catalogItemsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const [row] = await db
      .insert(catalogItems)
      .values({ ...body, unitPrice: body.unitPrice?.toString() })
      .returning();
    res.status(201).json(serialize(row));
  })
);

// null clears an optional field (e.g. remove a price or fall back to the default reorder point).
const updateSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  type: createSchema.shape.type,
  manufacturer: z.string().nullable(),
  model: z.string().nullable(),
  vendorId: z.string().uuid().nullable(),
  reorderPoint: z.number().int().min(0).nullable(),
  unitPrice: z.number().min(0).nullable(),
}).partial();

catalogItemsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const [row] = await db
      .update(catalogItems)
      .set({
        ...body,
        unitPrice: body.unitPrice === undefined ? undefined : body.unitPrice === null ? null : body.unitPrice.toString(),
        updatedAt: new Date(),
      })
      .where(eq(catalogItems.id, req.params.id))
      .returning();
    if (!row) throw new NotFoundError("Catalog item not found");
    res.json(serialize(row));
  })
);

// Only items that were never stocked, ordered, or moved can be deleted;
// otherwise the history would lose its item names.
catalogItemsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const [stock] = await db.select({ id: stockItems.id }).from(stockItems).where(eq(stockItems.catalogItemId, id)).limit(1);
    const [line] = await db
      .select({ id: purchaseOrderLines.id })
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.catalogItemId, id))
      .limit(1);
    const [txn] = await db
      .select({ id: inventoryTransactions.id })
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.catalogItemId, id))
      .limit(1);
    if (stock || line || txn) {
      throw new ConflictError("This item has stock, orders, or history, so it can't be deleted.");
    }
    const [row] = await db.delete(catalogItems).where(eq(catalogItems.id, id)).returning();
    if (!row) throw new NotFoundError("Catalog item not found");
    res.status(204).end();
  })
);
