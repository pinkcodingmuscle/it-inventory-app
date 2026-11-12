// Netlify Function entry point: the whole Express API (server/src/app.ts).
// Requests to /api/* are rewritten here by netlify.toml.
export { handler } from "../../server/src/netlify.js";
