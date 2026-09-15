import { Router } from "express";
import { db } from "../db/client.js";
import { inventoryTransactions } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const inventoryTransactionsRouter = Router();

// Append-only audit trail: no create/update/delete routes are exposed here
// directly. Rows are produced only as a side effect of the stock and
// purchase-order services above.
inventoryTransactionsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(inventoryTransactions);
    res.json(rows);
  })
);
