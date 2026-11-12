import "./env.js";
import serverless from "serverless-http";
import { createApp } from "./app.js";

// Runs the Express API as a Netlify Function. netlify.toml rewrites
// /api/* to this function; depending on how it's invoked the request path
// arrives as /api/... or /.netlify/functions/api/..., so normalize to the
// /api/... paths the Express routes are mounted on.
const app = createApp();

export const handler = serverless(app, {
  request(req: { url?: string }) {
    if (req.url?.startsWith("/.netlify/functions/api")) {
      req.url = "/api" + req.url.slice("/.netlify/functions/api".length);
    }
  },
});
