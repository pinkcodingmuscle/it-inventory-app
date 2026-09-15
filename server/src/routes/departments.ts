import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { departments } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const departmentsRouter = Router();

departmentsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(departments);
    res.json(rows);
  })
);

const createSchema = z.object({ name: z.string().min(1) });

departmentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const [row] = await db.insert(departments).values(body).returning();
    res.status(201).json(row);
  })
);
