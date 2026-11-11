import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireSession } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { catalogItemsRouter } from "./routes/catalogItems.js";
import { departmentsRouter } from "./routes/departments.js";
import { inventoryTransactionsRouter } from "./routes/inventoryTransactions.js";
import { locationsRouter } from "./routes/locations.js";
import { settingsRouter } from "./routes/settings.js";
import { purchaseOrdersRouter } from "./routes/purchaseOrders.js";
import { stockRouter } from "./routes/stock.js";
import { usersRouter } from "./routes/users.js";
import { vendorsRouter } from "./routes/vendors.js";

export function createApp() {
  const app = express();

  // Vite picks the next free port when its default is taken, so allow any
  // localhost origin in dev rather than pinning to a single port.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(
    cors({
      origin: corsOrigin ?? /^http:\/\/localhost:\d+$/,
    })
  );
  app.use(express.json());
  // Render (and most hosts) sit behind one proxy; trust it so req.ip is the
  // real client address for the sign-in rate limit.
  app.set("trust proxy", 1);

  // Deliberately does not query the database: Render pings this every few
  // seconds, and a DB check would keep a Neon free-tier compute awake 24/7
  // and burn through its monthly compute allowance.
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  // Sign-in is the only API route that works without a session.
  app.use("/api/auth", authRouter);
  app.use("/api", requireSession);

  app.use("/api/departments", departmentsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/locations", locationsRouter);
  app.use("/api/vendors", vendorsRouter);
  app.use("/api/catalog-items", catalogItemsRouter);
  app.use("/api/purchase-orders", purchaseOrdersRouter);
  app.use("/api/stock", stockRouter);
  app.use("/api/inventory-transactions", inventoryTransactionsRouter);
  app.use("/api/settings", settingsRouter);

  app.use(errorHandler);

  return app;
}
