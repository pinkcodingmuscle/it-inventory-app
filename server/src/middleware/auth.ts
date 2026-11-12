import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

// No sign-in: the app is used by a two-person IT department, and every request
// acts as one shared "IT Department" user. That user is still recorded on each
// inventory transaction (the history's "By" column), which the database
// requires. Anyone who can reach the API can read and change everything, so
// keep the site's address private.
export interface Actor {
  id: string;
  name: string;
}

declare module "express-serve-static-core" {
  interface Request {
    actor?: Actor;
  }
}

export const DEPARTMENT_USER_EMAIL = "it-department@local.invalid";

let cached: Actor | null = null;

/** Finds the shared department user, creating it the first time. */
export async function getDepartmentActor(): Promise<Actor> {
  if (cached) return cached;
  const [existing] = await db.select().from(users).where(eq(users.email, DEPARTMENT_USER_EMAIL)).limit(1);
  const user =
    existing ??
    (
      await db
        .insert(users)
        .values({ name: "IT Department", email: DEPARTMENT_USER_EMAIL, role: "IT Department" })
        .onConflictDoNothing({ target: users.email })
        .returning()
    )[0] ??
    (await db.select().from(users).where(eq(users.email, DEPARTMENT_USER_EMAIL)).limit(1))[0];
  cached = { id: user.id, name: user.name };
  return cached;
}

/** Test hook: forget the cached user (tests truncate the users table). */
export function resetDepartmentActor() {
  cached = null;
}

export async function attachDepartmentActor(req: Request, _res: Response, next: NextFunction) {
  try {
    req.actor = await getDepartmentActor();
    next();
  } catch (err) {
    next(err);
  }
}
