import { and, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { inventoryTransactions } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const inventoryTransactionsRouter = Router();

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const querySchema = z.object({
  catalogItemId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  /** Inclusive start date (UTC), YYYY-MM-DD. */
  from: date.optional(),
  /** Inclusive end date (UTC), YYYY-MM-DD. */
  to: date.optional(),
  limit: z.coerce.number().int().min(1).max(10_000).default(10_000),
});

// Append-only audit trail: no create/update/delete routes are exposed here
// directly. Rows are produced only as a side effect of the stock and
// purchase-order services. Newest first; filter by item, location, and date
// so clients don't have to download the whole history.
inventoryTransactionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = querySchema.parse(req.query);
    const where: SQL[] = [];
    if (q.catalogItemId) where.push(eq(inventoryTransactions.catalogItemId, q.catalogItemId));
    if (q.locationId) where.push(eq(inventoryTransactions.locationId, q.locationId));
    if (q.from) where.push(gte(inventoryTransactions.createdAt, new Date(`${q.from}T00:00:00Z`)));
    if (q.to) {
      const end = new Date(`${q.to}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      where.push(lt(inventoryTransactions.createdAt, end));
    }
    const rows = await db
      .select()
      .from(inventoryTransactions)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(q.limit);
    res.json(rows);
  })
);
