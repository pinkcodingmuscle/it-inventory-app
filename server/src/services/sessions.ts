import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions, users } from "../db/schema.js";

/** How long a sign-in lasts before the user has to sign in again. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a session and returns the bearer token. Only its hash is stored. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  // Opportunistic cleanup so expired rows don't pile up.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  return { token, expiresAt };
}

/** The active user a token belongs to, or null if the token is unknown, expired, or the user is inactive. */
export async function findSessionUser(token: string) {
  const [row] = await db
    .select({ user: users, sessionId: sessions.id })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || row.user.status !== "active") return null;
  return row;
}

export async function deleteSessionByToken(token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/** Signs a user out everywhere (after a password reset or deactivation). */
export async function deleteSessionsForUser(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
