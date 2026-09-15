import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

// NOTE: This is a development-only authorization stub, not real authentication.
// There is no login flow or identity provider yet. The caller identifies which
// user is acting via the `x-user-id` header (falling back to a seeded admin),
// and that user's job-title `role` string is mapped onto one of the four
// permission tiers from the persistence proposal so that route guards have
// something real to check. Requests without a header use the first active user
// so imported workbooks can be viewed without seeded development identities.
// Replace this with real session/token auth before production use.
export type Permission = "administrator" | "inventory_manager" | "technician" | "read_only";

export interface Actor {
  id: string;
  name: string;
  role: string;
  permission: Permission;
}

declare module "express-serve-static-core" {
  interface Request {
    actor?: Actor;
  }
}

function derivePermission(role: string): Permission {
  const normalized = role.toLowerCase();
  if (normalized.includes("administrator")) return "administrator";
  if (normalized.includes("manager")) return "inventory_manager";
  if (normalized.includes("support") || normalized.includes("technician") || normalized.includes("engineer")) {
    return "technician";
  }
  return "read_only";
}

export async function attachActor(req: Request, res: Response, next: NextFunction) {
  try {
    const headerUserId = req.header("x-user-id");
    const [user] = headerUserId && headerUserId.trim()
      ? await db.select().from(users).where(eq(users.id, headerUserId.trim())).limit(1)
      : await db.select().from(users).where(eq(users.status, "active")).limit(1);
    if (!user || user.status !== "active") {
      res.status(401).json({ error: "Unknown or inactive actor. Provide a valid x-user-id header." });
      return;
    }
    req.actor = { id: user.id, name: user.name, role: user.role, permission: derivePermission(user.role) };
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(...allowed: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.actor) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }
    if (!allowed.includes(req.actor.permission)) {
      res.status(403).json({ error: "You do not have permission to perform this action." });
      return;
    }
    next();
  };
}
