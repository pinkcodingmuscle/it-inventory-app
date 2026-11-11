import type { NextFunction, Request, Response } from "express";
import type { users } from "../db/schema.js";
import { findSessionUser } from "../services/sessions.js";

// Session authentication. Clients sign in at POST /api/auth/login and send the
// returned token as `Authorization: Bearer <token>`. The user's job-title
// `role` is mapped onto one of four permission tiers that the route guards check.
export type Permission = "administrator" | "inventory_manager" | "technician" | "read_only";

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: string;
  permission: Permission;
}

declare module "express-serve-static-core" {
  interface Request {
    actor?: Actor;
    sessionToken?: string;
  }
}

export function derivePermission(role: string): Permission {
  const normalized = role.toLowerCase();
  if (normalized.includes("administrator")) return "administrator";
  if (normalized.includes("manager")) return "inventory_manager";
  if (normalized.includes("support") || normalized.includes("technician") || normalized.includes("engineer")) {
    return "technician";
  }
  return "read_only";
}

export function toActor(user: typeof users.$inferSelect): Actor {
  return { id: user.id, name: user.name, email: user.email, role: user.role, permission: derivePermission(user.role) };
}

function bearerToken(req: Request): string | null {
  const header = req.header("authorization");
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

/** Rejects the request with 401 unless it carries a valid, unexpired session token. */
export async function requireSession(req: Request, res: Response, next: NextFunction) {
  try {
    const token = bearerToken(req);
    const found = token ? await findSessionUser(token) : null;
    if (!token || !found) {
      res.status(401).json({ error: "Please sign in." });
      return;
    }
    req.actor = toActor(found.user);
    req.sessionToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(...allowed: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.actor) {
      res.status(401).json({ error: "Please sign in." });
      return;
    }
    if (!allowed.includes(req.actor.permission)) {
      res.status(403).json({ error: "You do not have permission to perform this action." });
      return;
    }
    next();
  };
}
