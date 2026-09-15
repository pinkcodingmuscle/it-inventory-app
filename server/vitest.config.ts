import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://inventory_app:local_development_password@localhost:5432/it_inventory_test";

export default defineConfig({
  test: {
    environment: "node",
    env: { DATABASE_URL: TEST_DATABASE_URL },
    globalSetup: "./src/test/globalSetup.ts",
    // Tests truncate and reseed shared tables between cases, so run test
    // files one at a time rather than racing them against the same database.
    fileParallelism: false,
  },
});
