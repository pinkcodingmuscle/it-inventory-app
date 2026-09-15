import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  process.env.TEST_DATABASE_URL ??
  "postgresql://inventory_app:local_development_password@localhost:5432/it_inventory_test";

const dbName = TEST_DATABASE_URL.split("/").pop()!;
const adminUrl = TEST_DATABASE_URL.replace(/\/[^/]+$/, "/postgres");

export default async function globalSetup() {
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  }
  await admin.end();

  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./migrations" });
  await pool.end();
}
