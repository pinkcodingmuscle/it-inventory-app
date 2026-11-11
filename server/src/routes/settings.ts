import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { appSettings } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requirePermission } from "../middleware/auth.js";

export const settingsRouter = Router();

const SETTINGS_ID = "default";

export const settingsSchema = z.object({
  organizationName: z.string().trim().max(200),
  defaultLocationId: z.string(),
  currency: z.enum(["USD", "CAD", "EUR"]),
  lowStockAlerts: z.boolean(),
  lowStockThreshold: z.number().int().min(0),
  extraCategories: z.array(z.string().trim().min(1).max(100)).max(200),
  supportEmail: z.union([z.literal(""), z.string().trim().email()]),
});

export type AppSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: AppSettings = {
  organizationName: "Kayaku Advanced Materials",
  defaultLocationId: "",
  currency: "USD",
  lowStockAlerts: true,
  lowStockThreshold: 0,
  extraCategories: [],
  supportEmail: "",
};

/** `saved: false` means nobody has saved settings yet (the client may migrate its old local copy). */
settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID)).limit(1);
    // Merge over defaults so settings added in later versions get a value.
    const settings = { ...defaultSettings, ...((row?.data as Partial<AppSettings>) ?? {}) };
    res.json({ settings, saved: !!row, updatedAt: row?.updatedAt ?? null });
  })
);

settingsRouter.put(
  "/",
  requirePermission("administrator", "inventory_manager"),
  asyncHandler(async (req, res) => {
    const settings = settingsSchema.parse(req.body);
    const [row] = await db
      .insert(appSettings)
      .values({ id: SETTINGS_ID, data: settings })
      .onConflictDoUpdate({ target: appSettings.id, set: { data: settings, updatedAt: new Date() } })
      .returning();
    res.json({ settings, saved: true, updatedAt: row.updatedAt });
  })
);
