import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// All environment variables live in the single .env at the project root.
// Resolves the same from src/ (tsx) and dist/ (compiled).
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
