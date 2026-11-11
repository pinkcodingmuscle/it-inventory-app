import "../env.js";
import { sql } from "drizzle-orm";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { db, pool } from "../db/client.js";
import { departments, users } from "../db/schema.js";
import { MIN_PASSWORD_LENGTH, hashPassword } from "../lib/passwords.js";
import { deleteSessionsForUser } from "../services/sessions.js";

// Sets a user's sign-in password, creating the user as an IT Administrator if
// `--name` is given and no user has that email yet. This is how the first
// administrator gets in; after that, administrators manage users in Settings.
//
//   npm run user:set-password -- you@example.com
//   npm run user:set-password -- you@example.com --name "Your Name"
//
// The password is typed at a hidden prompt, or read from NEW_PASSWORD for scripts.

const usage = 'Usage: npm run user:set-password -- <email> [--name "Full Name"] [--role "IT Administrator"]';

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i] ?? "";
    else positional.push(argv[i]);
  }
  return { email: positional[0]?.trim(), name: flags.name?.trim(), role: flags.role?.trim() || "IT Administrator" };
}

function promptHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function readPassword(): Promise<string> {
  if (process.env.NEW_PASSWORD) return process.env.NEW_PASSWORD;
  if (!process.stdin.isTTY) throw new Error("No terminal to prompt in. Set NEW_PASSWORD instead.");
  const first = await promptHidden("New password: ");
  const second = await promptHidden("Repeat password: ");
  if (first !== second) throw new Error("The passwords don't match.");
  return first;
}

async function main() {
  const { email, name, role } = parseArgs(process.argv.slice(2));
  if (!email || !email.includes("@")) throw new Error(usage);

  const [existing] = await db.select().from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`).limit(1);
  if (!existing && !name) {
    throw new Error(`No user has the email ${email}. Add --name "Full Name" to create them as an ${role}.`);
  }

  const password = await readPassword();
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  const passwordHash = await hashPassword(password);

  if (existing) {
    await db.update(users).set({ passwordHash, status: "active", updatedAt: new Date() }).where(sql`${users.id} = ${existing.id}`);
    await deleteSessionsForUser(existing.id);
    console.log(`Password set for ${existing.name} (${existing.email}, ${existing.role}).`);
  } else {
    const [dept] = await db.select().from(departments).limit(1);
    const [created] = await db
      .insert(users)
      .values({ name: name!, email, role, passwordHash, departmentId: dept?.id })
      .returning();
    console.log(`Created ${created.name} (${created.email}) as ${created.role}.`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
