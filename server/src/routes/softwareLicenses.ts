import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { softwareLicenses } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requirePermission } from "../middleware/auth.js";
import { assignSoftware } from "../services/software.js";

export const softwareLicensesRouter = Router();

softwareLicensesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(softwareLicenses);
    res.json(rows);
  })
);

const createSchema = z.object({
  catalogItemId: z.string().uuid(),
  licenseType: z.enum(["subscription", "perpetual", "volume"]),
  totalSeats: z.number().int().min(0),
  renewalDate: z.string().optional(),
  vendorId: z.string().uuid().optional(),
});

softwareLicensesRouter.post(
  "/",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const [row] = await db.insert(softwareLicenses).values(body).returning();
    res.status(201).json(row);
  })
);

const assignSchema = z.object({
  userId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
});

softwareLicensesRouter.post(
  "/:id/assign",
  requirePermission("administrator", "inventory_manager", "technician"),
  asyncHandler(async (req, res) => {
    const body = assignSchema.parse(req.body);
    const row = await assignSoftware(req.params.id, body.userId, body.assetId);
    res.status(201).json(row);
  })
);
