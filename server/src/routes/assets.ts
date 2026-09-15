import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { assets } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { NotFoundError } from "../lib/errors.js";
import { requirePermission } from "../middleware/auth.js";
import { assignAsset, moveAsset, retireAsset } from "../services/assets.js";

export const assetsRouter = Router();

assetsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(assets);
    res.json(rows);
  })
);

assetsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [row] = await db.select().from(assets).where(eq(assets.id, req.params.id)).limit(1);
    if (!row) throw new NotFoundError("Asset not found");
    res.json(row);
  })
);

const createSchema = z.object({
  catalogItemId: z.string().uuid(),
  assetTag: z.string().min(1),
  serialNumber: z.string().min(1),
  status: z.enum(["active", "in_storage", "under_repair", "retired"]).default("in_storage"),
  purchaseOrderId: z.string().uuid().optional(),
  purchaseDate: z.string().optional(),
  warrantyEndDate: z.string().optional(),
  locationId: z.string().uuid(),
  assignedUserId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

assetsRouter.post(
  "/",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const [row] = await db.insert(assets).values(body).returning();
    res.status(201).json(row);
  })
);

const updateSchema = createSchema.partial();

assetsRouter.patch(
  "/:id",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const [row] = await db
      .update(assets)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(assets.id, req.params.id))
      .returning();
    if (!row) throw new NotFoundError("Asset not found");
    res.json(row);
  })
);

const assignSchema = z.object({ toUserId: z.string().uuid() });

assetsRouter.post(
  "/:id/assign",
  requirePermission("administrator", "inventory_manager", "technician"),
  asyncHandler(async (req, res) => {
    const { toUserId } = assignSchema.parse(req.body);
    const row = await assignAsset(req.params.id, toUserId);
    res.json(row);
  })
);

const moveSchema = z.object({ toLocationId: z.string().uuid() });

assetsRouter.post(
  "/:id/move",
  requirePermission("administrator", "inventory_manager", "technician"),
  asyncHandler(async (req, res) => {
    const { toLocationId } = moveSchema.parse(req.body);
    const row = await moveAsset(req.params.id, toLocationId);
    res.json(row);
  })
);

const retireSchema = z.object({ notes: z.string().optional() });

assetsRouter.post(
  "/:id/retire",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const { notes } = retireSchema.parse(req.body ?? {});
    const row = await retireAsset(req.params.id, notes);
    res.json(row);
  })
);
