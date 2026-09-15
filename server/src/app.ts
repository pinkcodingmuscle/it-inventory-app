import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { attachActor } from "./middleware/auth.js";
import { assetEventsRouter } from "./routes/assetEvents.js";
import { assetsRouter } from "./routes/assets.js";
import { catalogItemsRouter } from "./routes/catalogItems.js";
import { departmentsRouter } from "./routes/departments.js";
import { inventoryTransactionsRouter } from "./routes/inventoryTransactions.js";
import { locationsRouter } from "./routes/locations.js";
import { purchaseOrdersRouter } from "./routes/purchaseOrders.js";
import { softwareAssignmentsRouter } from "./routes/softwareAssignments.js";
import { softwareLicensesRouter } from "./routes/softwareLicenses.js";
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

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api", attachActor);

  app.use("/api/departments", departmentsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/locations", locationsRouter);
  app.use("/api/vendors", vendorsRouter);
  app.use("/api/catalog-items", catalogItemsRouter);
  app.use("/api/purchase-orders", purchaseOrdersRouter);
  app.use("/api/assets", assetsRouter);
  app.use("/api/stock", stockRouter);
  app.use("/api/software-licenses", softwareLicensesRouter);
  app.use("/api/software-assignments", softwareAssignmentsRouter);
  app.use("/api/inventory-transactions", inventoryTransactionsRouter);
  app.use("/api/asset-events", assetEventsRouter);

  app.use(errorHandler);

  return app;
}
