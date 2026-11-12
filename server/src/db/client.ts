import "../env.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Create .env in the project root (see README).");
}

// Local Docker Postgres has no TLS; any hosted database (Neon, ...)
// must be reached over TLS. If the URL already says how (`?sslmode=...`),
// respect it; otherwise require TLS for anything that isn't local.
const { hostname, searchParams } = new URL(connectionString);
const isLocal = ["localhost", "127.0.0.1", "[::1]", "postgres"].includes(hostname);
const ssl = !isLocal && !searchParams.has("sslmode") ? true : undefined;

export const pool = new Pool({
  connectionString,
  ssl,
  // Each serverless function instance has its own pool, and many can run at
  // once, so keep them small there (Neon's pooled URL absorbs the rest).
  max: Number(process.env.PG_POOL_MAX ?? (process.env.AWS_LAMBDA_FUNCTION_NAME ? 3 : 10)),
  // Release idle connections so a serverless database (Neon) can scale to
  // zero between bursts of traffic instead of being held awake by the pool.
  idleTimeoutMillis: 30_000,
  // Allow time for a suspended Neon compute to wake on the first request.
  connectionTimeoutMillis: 15_000,
});

// Neon (and most hosted Postgres) closes idle connections server-side. pg
// emits that as an 'error' on the pool; without a listener Node treats it as
// unhandled and crashes the API. The pool discards the dead client itself.
pool.on("error", (err) => {
  console.error("Idle database client error (connection will be replaced):", err.message);
});

export const db = drizzle(pool, { schema });
