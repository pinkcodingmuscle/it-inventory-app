import { eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { BadRequestError, HttpError } from "../lib/errors.js";
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "../lib/passwords.js";
import { requireSession, toActor } from "../middleware/auth.js";
import { createSession, deleteSessionByToken, deleteSessionsForUser } from "../services/sessions.js";

export const authRouter = Router();

// Simple in-memory brute-force guard: at most MAX_FAILURES failed sign-ins per
// email (and per IP) in WINDOW_MS. Good enough for a single API instance.
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; since: number }>();

function isLockedOut(key: string) {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.since > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string) {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.since > WINDOW_MS) failures.set(key, { count: 1, since: Date.now() });
  else entry.count += 1;
}

// Sign-ups per IP address per hour, so a script can't flood the approval queue.
// An office shares one public IP, hence a fairly generous default.
export const MAX_SIGNUPS = Number(process.env.SIGNUPS_PER_HOUR ?? 20);
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const signups = new Map<string, { count: number; since: number }>();

/** Test hook: forget failed attempts and sign-up counts. */
export function resetLoginThrottle() {
  failures.clear();
  signups.clear();
}

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const emailKey = `email:${email.toLowerCase()}`;
    const ipKey = `ip:${req.ip}`;
    if (isLockedOut(emailKey) || isLockedOut(ipKey)) {
      throw new HttpError(429, "Too many failed sign-in attempts. Wait 15 minutes and try again.");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
      .limit(1);
    // Always run a hash comparison so response time doesn't reveal which emails exist.
    const ok = await verifyPassword(password, user?.passwordHash ?? "scrypt$AAAA$AAAA");
    if (!user || !ok) {
      recordFailure(emailKey);
      recordFailure(ipKey);
      res.status(401).json({ error: "Incorrect email or password." });
      return;
    }
    // Only explain why a correct password can't be used yet; a wrong one gets the generic message above.
    if (user.status === "pending") {
      throw new HttpError(403, "Your account is waiting for an administrator to approve it.");
    }
    if (user.status !== "active") {
      throw new HttpError(403, "This account has been deactivated. Contact an administrator.");
    }

    failures.delete(emailKey);
    const { token, expiresAt } = await createSession(user.id);
    res.json({ token, expiresAt: expiresAt.toISOString(), user: toActor(user) });
  })
);

authRouter.get("/me", requireSession, (req, res) => {
  res.json({ user: req.actor });
});

authRouter.post(
  "/logout",
  requireSession,
  asyncHandler(async (req, res) => {
    await deleteSessionByToken(req.sessionToken!);
    res.status(204).end();
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`),
});

authRouter.post(
  "/change-password",
  requireSession,
  asyncHandler(async (req, res) => {
    const body = changePasswordSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq(users.id, req.actor!.id)).limit(1);
    if (!(await verifyPassword(body.currentPassword, user?.passwordHash))) {
      throw new BadRequestError("Your current password is incorrect.");
    }
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    // Sign out other devices but keep this one: issue a fresh token.
    await deleteSessionsForUser(user.id);
    const { token, expiresAt } = await createSession(user.id);
    res.json({ token, expiresAt: expiresAt.toISOString() });
  })
);

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(200),
  email: z.string().trim().email("Enter a valid email address.").max(320),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`),
});

/**
 * Self-service sign-up. The account starts as `pending` with the read-only
 * "Viewer" role and can't sign in until an administrator approves it (and
 * picks its real role) in Settings → Users.
 */
authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const body = signupSchema.parse(req.body);
    const ipKey = `ip:${req.ip}`;
    const entry = signups.get(ipKey);
    if (entry && Date.now() - entry.since <= SIGNUP_WINDOW_MS && entry.count >= MAX_SIGNUPS) {
      throw new HttpError(429, "Too many sign-ups from this network. Try again later.");
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${body.email.toLowerCase()}`)
      .limit(1);
    if (existing) throw new HttpError(409, "An account with that email already exists. Try signing in instead.");

    await db.insert(users).values({
      name: body.name,
      email: body.email,
      role: "Viewer",
      status: "pending",
      passwordHash: await hashPassword(body.password),
    });
    if (!entry || Date.now() - entry.since > SIGNUP_WINDOW_MS) signups.set(ipKey, { count: 1, since: Date.now() });
    else entry.count += 1;
    res.status(201).json({ status: "pending" });
  })
);
