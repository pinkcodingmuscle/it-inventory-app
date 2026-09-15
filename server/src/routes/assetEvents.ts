import { Router } from "express";
import { db } from "../db/client.js";
import { assetEvents } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const assetEventsRouter = Router();

// Append-only audit trail: rows are produced only as a side effect of the
// asset assign/move/retire services above.
assetEventsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(assetEvents);
    res.json(rows);
  })
);
