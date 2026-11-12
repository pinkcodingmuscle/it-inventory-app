import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  adjustStock,
  checkoutStock,
  createStockItem,
  deleteStockItem,
  listStockWithCheckedOut,
  returnStock,
  updateStockItem,
} from "../services/stock.js";

export const stockRouter = Router();

stockRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await listStockWithCheckedOut());
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
  asyncHandler(async (req, res) => {
    const body = checkoutSchema.parse(req.body);
    const result = await checkoutStock(req.params.id, body.quantity, req.actor!.id, body);
    res.status(201).json(result);
  })
);

stockRouter.post(
  "/:id/return",
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
  asyncHandler(async (req, res) => {
    const body = adjustSchema.parse(req.body);
    const result = await adjustStock(req.params.id, body.quantity, req.actor!.id, body.notes);
    res.status(201).json(result);
  })
);

const updateSchema = z.object({ reorderPoint: z.number().int().min(0).nullable() }).partial();

stockRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    res.json(await updateStockItem(req.params.id, body));
  })
);

stockRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteStockItem(req.params.id);
    res.status(204).end();
  })
);
