import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs from server/; env vars live in the project-root .env.
config({ path: "../.env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Create .env in the project root (see README).");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
