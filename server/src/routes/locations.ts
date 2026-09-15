import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { assets, locations, stockItems } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { ConflictError, NotFoundError } from "../lib/errors.js";
import { requirePermission } from "../middleware/auth.js";

export const locationsRouter = Router();

locationsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(locations);
    res.json(rows);
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["office", "storage", "meeting_room", "remote"]),
  managerUserId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

locationsRouter.post(
  "/",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const [row] = await db.insert(locations).values(body).returning();
    res.status(201).json(row);
  })
);

const updateSchema = createSchema.partial();

locationsRouter.patch(
  "/:id",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const [row] = await db
      .update(locations)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(locations.id, req.params.id))
      .returning();
    if (!row) throw new NotFoundError("Location not found");
    res.json(row);
  })
);

// Locations must not be deleted while assets or stock remain assigned to
// them (section 11 of the persistence proposal).
locationsRouter.delete(
  "/:id",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const locationId = req.params.id;
    const [assetAtLocation] = await db.select({ id: assets.id }).from(assets).where(eq(assets.locationId, locationId)).limit(1);
    if (assetAtLocation) throw new ConflictError("Cannot delete a location that still has assets assigned to it.");
    const [stockAtLocation] = await db
      .select({ id: stockItems.id })
      .from(stockItems)
      .where(eq(stockItems.locationId, locationId))
      .limit(1);
    if (stockAtLocation) throw new ConflictError("Cannot delete a location that still has stock assigned to it.");

    const [row] = await db.delete(locations).where(eq(locations.id, locationId)).returning();
    if (!row) throw new NotFoundError("Location not found");
    res.status(204).end();
  })
);
