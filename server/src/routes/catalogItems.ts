import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { catalogItems } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { NotFoundError } from "../lib/errors.js";
import { toNumber } from "../lib/serialize.js";
import { requirePermission } from "../middleware/auth.js";

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
  type: z.enum(["asset", "consumable", "accessory", "software"]),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  vendorId: z.string().uuid().optional(),
  reorderPoint: z.number().int().min(0).optional(),
  lifecycleMonths: z.number().int().positive().optional(),
  unitPrice: z.number().min(0).optional(),
});

catalogItemsRouter.post(
  "/",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const [row] = await db
      .insert(catalogItems)
      .values({ ...body, unitPrice: body.unitPrice?.toString() })
      .returning();
    res.status(201).json(serialize(row));
  })
);

const updateSchema = createSchema.partial();

catalogItemsRouter.patch(
  "/:id",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const [row] = await db
      .update(catalogItems)
      .set({ ...body, unitPrice: body.unitPrice?.toString(), updatedAt: new Date() })
      .where(eq(catalogItems.id, req.params.id))
      .returning();
    if (!row) throw new NotFoundError("Catalog item not found");
    res.json(serialize(row));
  })
);
