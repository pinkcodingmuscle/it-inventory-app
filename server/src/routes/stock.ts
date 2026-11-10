import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { stockItems } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requirePermission } from "../middleware/auth.js";
import { adjustStock, checkoutStock, createStockItem, returnStock } from "../services/stock.js";

export const stockRouter = Router();

stockRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(stockItems);
    res.json(rows);
  })
);

const createSchema = z.object({
  catalogItemId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().min(0),
  reorderPoint: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

stockRouter.post(
  "/",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const result = await createStockItem(body, req.actor!.id);
    res.status(201).json(result);
  })
);

const checkoutSchema = z.object({
  quantity: z.number().int().positive(),
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
