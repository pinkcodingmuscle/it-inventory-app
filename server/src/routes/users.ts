import { Router } from "express";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const usersRouter = Router();

// Read-only: users are the people recorded on inventory transactions (the
// shared "IT Department" user, plus "Data Importer" for imported stock) and
// optional location managers. There is no sign-in, so nothing to manage here.
usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(users);
    res.json(rows);
  })
);
