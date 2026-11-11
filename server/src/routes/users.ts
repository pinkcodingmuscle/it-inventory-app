import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { inventoryTransactions, users } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors.js";
import { MIN_PASSWORD_LENGTH, hashPassword } from "../lib/passwords.js";
import { requirePermission } from "../middleware/auth.js";
import { deleteSessionsForUser } from "../services/sessions.js";

export const usersRouter = Router();

/** Never send password hashes to the browser; just say whether one is set. */
function serialize(row: typeof users.$inferSelect) {
  const { passwordHash, ...rest } = row;
  return { ...rest, hasPassword: passwordHash != null };
}

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(users);
    res.json(rows.map(serialize));
  })
);

usersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [row] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!row) throw new NotFoundError("User not found");
    res.json(serialize(row));
  })
);

const password = z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`);

const createSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.string().min(1),
  departmentId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  password: password.optional(),
});

usersRouter.post(
  "/",
  requirePermission("administrator"),
  asyncHandler(async (req, res) => {
    const { password: pw, ...body } = createSchema.parse(req.body);
    const [row] = await db
      .insert(users)
      .values({ ...body, passwordHash: pw ? await hashPassword(pw) : undefined })
      .returning();
    res.status(201).json(serialize(row));
  })
);

const updateSchema = createSchema.omit({ password: true }).partial();

usersRouter.patch(
  "/:id",
  requirePermission("administrator"),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    if (req.params.id === req.actor!.id && (body.status === "inactive" || (body.role && !/administrator/i.test(body.role)))) {
      throw new BadRequestError("You can't deactivate yourself or remove your own administrator role.");
    }
    const [row] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, req.params.id))
      .returning();
    if (!row) throw new NotFoundError("User not found");
    if (row.status === "inactive") await deleteSessionsForUser(row.id);
    res.json(serialize(row));
  })
);

/** An administrator sets (or resets) another user's password. Signs that user out everywhere. */
usersRouter.post(
  "/:id/password",
  requirePermission("administrator"),
  asyncHandler(async (req, res) => {
    const body = z.object({ password }).parse(req.body);
    const [row] = await db
      .update(users)
      .set({ passwordHash: await hashPassword(body.password), updatedAt: new Date() })
      .where(eq(users.id, req.params.id))
      .returning();
    if (!row) throw new NotFoundError("User not found");
    await deleteSessionsForUser(row.id);
    res.json(serialize(row));
  })
);

/** Declines a sign-up request: deletes a pending account (active or inactive users can't be deleted). */
usersRouter.delete(
  "/:id",
  requirePermission("administrator"),
  asyncHandler(async (req, res) => {
    const [row] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!row) throw new NotFoundError("User not found");
    if (row.status !== "pending") {
      throw new ConflictError("Only sign-up requests can be deleted. Deactivate other users instead.");
    }
    const [txn] = await db
      .select({ id: inventoryTransactions.id })
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.performedByUserId, row.id))
      .limit(1);
    if (txn) throw new ConflictError("This user has history, so deactivate them instead.");
    await db.delete(users).where(eq(users.id, row.id));
    res.status(204).end();
  })
);
