import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { stockItems } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requirePermission } from "../middleware/auth.js";
import { adjustStock, checkoutStock, returnStock } from "../services/stock.js";

export const stockRouter = Router();

stockRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(stockItems);
    res.json(rows);
  })
);

const checkoutSchema = z.object({
  quantity: z.number().int().positive(),
  relatedAssetId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

stockRouter.post(
  "/:id/checkout",
  requirePermission("administrator", "inventory_manager", "technician"),
  asyncHandler(async (req, res) => {
    const body = checkoutSchema.parse(req.body);
    const result = await checkoutStock(req.params.id, body.quantity, req.actor!.id, body);
    res.status(201).json(result);
  })
);

stockRouter.post(
  "/:id/return",
  requirePermission("administrator", "inventory_manager", "technician"),
  asyncHandler(async (req, res) => {
    const body = checkoutSchema.parse(req.body);
    const result = await returnStock(req.params.id, body.quantity, req.actor!.id, body);
    res.status(201).json(result);
  })
);

const adjustSchema = z.object({
  quantity: z.number().int().min(0),
  notes: z.string().optional(),
});

stockRouter.post(
  "/:id/adjust",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = adjustSchema.parse(req.body);
    const result = await adjustStock(req.params.id, body.quantity, req.actor!.id, body.notes);
    res.status(201).json(result);
  })
);
