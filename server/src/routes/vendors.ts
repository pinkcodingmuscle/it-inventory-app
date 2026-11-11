import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { purchaseOrders, vendors } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { ConflictError, NotFoundError } from "../lib/errors.js";
import { requirePermission } from "../middleware/auth.js";

export const vendorsRouter = Router();

vendorsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(vendors);
    res.json(rows);
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["hardware", "software", "accessories", "other"]),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

vendorsRouter.post(
  "/",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const [row] = await db.insert(vendors).values(body).returning();
    res.status(201).json(row);
  })
);

// null clears an optional field.
const updateSchema = z.object({
  name: z.string().min(1),
  category: createSchema.shape.category,
  contactName: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
}).partial();

vendorsRouter.patch(
  "/:id",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const [row] = await db
      .update(vendors)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(vendors.id, req.params.id))
      .returning();
    if (!row) throw new NotFoundError("Vendor not found");
    res.json(row);
  })
);

// Catalog items that named this vendor keep existing (their vendor is cleared),
// but purchase orders must keep their vendor, so a vendor with orders stays.
vendorsRouter.delete(
  "/:id",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const [order] = await db
      .select({ id: purchaseOrders.id })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.vendorId, req.params.id))
      .limit(1);
    if (order) throw new ConflictError("This vendor has purchase orders, so it can't be deleted.");
    const [row] = await db.delete(vendors).where(eq(vendors.id, req.params.id)).returning();
    if (!row) throw new NotFoundError("Vendor not found");
    res.status(204).end();
  })
);
