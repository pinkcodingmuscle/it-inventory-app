import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { vendors } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { NotFoundError } from "../lib/errors.js";
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

const updateSchema = createSchema.partial();

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
