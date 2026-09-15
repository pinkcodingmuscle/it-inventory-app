import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { NotFoundError } from "../lib/errors.js";
import { requirePermission } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(users);
    res.json(rows);
  })
);

usersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [row] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!row) throw new NotFoundError("User not found");
    res.json(row);
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
  departmentId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

usersRouter.post(
  "/",
  requirePermission("administrator"),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const [row] = await db.insert(users).values(body).returning();
    res.status(201).json(row);
  })
);

const updateSchema = createSchema.partial();

usersRouter.patch(
  "/:id",
  requirePermission("administrator"),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const [row] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, req.params.id))
      .returning();
    if (!row) throw new NotFoundError("User not found");
    res.json(row);
  })
);
