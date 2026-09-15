import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { purchaseOrderLines, purchaseOrders } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { NotFoundError } from "../lib/errors.js";
import { toNumber } from "../lib/serialize.js";
import { requirePermission } from "../middleware/auth.js";
import { receivePurchaseOrder } from "../services/purchaseOrders.js";

export const purchaseOrdersRouter = Router();

function serializeLine(line: typeof purchaseOrderLines.$inferSelect) {
  return { ...line, unitPrice: toNumber(line.unitPrice) };
}

purchaseOrdersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const orders = await db.select().from(purchaseOrders);
    const lines = await db.select().from(purchaseOrderLines);
    res.json({ purchaseOrders: orders, purchaseOrderLines: lines.map(serializeLine) });
  })
);

purchaseOrdersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, req.params.id)).limit(1);
    if (!po) throw new NotFoundError("Purchase order not found");
    const lines = await db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, req.params.id));
    res.json({ ...po, lines: lines.map(serializeLine) });
  })
);

const createSchema = z.object({
  purchaseOrderNumber: z.string().min(1),
  vendorId: z.string().uuid(),
  orderDate: z.string(),
  status: z.enum(["open", "received", "cancelled"]).optional(),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        catalogItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().min(0),
      })
    )
    .min(1),
});

purchaseOrdersRouter.post(
  "/",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const result = await db.transaction(async (tx) => {
      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          purchaseOrderNumber: body.purchaseOrderNumber,
          vendorId: body.vendorId,
          orderDate: body.orderDate,
          status: body.status,
          notes: body.notes,
        })
        .returning();
      const lines = await tx
        .insert(purchaseOrderLines)
        .values(
          body.lines.map((line) => ({
            purchaseOrderId: po.id,
            catalogItemId: line.catalogItemId,
            quantity: line.quantity,
            unitPrice: line.unitPrice.toString(),
          }))
        )
        .returning();
      return { ...po, lines: lines.map(serializeLine) };
    });
    res.status(201).json(result);
  })
);

const receiveSchema = z.object({
  locationId: z.string().uuid(),
  lines: z
    .array(
      z.object({
        lineId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

purchaseOrdersRouter.post(
  "/:id/receive",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const body = receiveSchema.parse(req.body);
    const result = await receivePurchaseOrder(req.params.id, body.locationId, body.lines, req.actor!.id);
    res.json({ ...result, lines: result.lines.map(serializeLine) });
  })
);
