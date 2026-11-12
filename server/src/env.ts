import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Locally, all environment variables live in the single .env at the project
// root. Resolves the same from src/ (tsx) and dist/ (compiled). On Netlify
// there is no .env file: variables come from the site settings, and a missing
// file is simply ignored.
try {
  config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
} catch {
  // import.meta.url can be unavailable once bundled; fall back to process.env.
}
