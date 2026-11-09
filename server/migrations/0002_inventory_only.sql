ALTER TABLE "asset_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "software_assignments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "software_licenses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "asset_events" CASCADE;--> statement-breakpoint
DROP TABLE "assets" CASCADE;--> statement-breakpoint
DROP TABLE "software_assignments" CASCADE;--> statement-breakpoint
DROP TABLE "software_licenses" CASCADE;--> statement-breakpoint
ALTER TABLE "catalog_items" DROP CONSTRAINT "catalog_items_lifecycle_months_check";--> statement-breakpoint
ALTER TABLE "catalog_items" DROP CONSTRAINT "catalog_items_type_check";--> statement-breakpoint
ALTER TABLE "inventory_transactions" DROP CONSTRAINT IF EXISTS "inventory_transactions_related_asset_id_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "catalog_items" DROP COLUMN IF EXISTS "lifecycle_months";--> statement-breakpoint
ALTER TABLE "inventory_transactions" DROP COLUMN IF EXISTS "related_asset_id";--> statement-breakpoint
-- Individually tracked assets and software are out of scope; keep any such
-- catalog items (and their stock/purchase history) by reclassifying them.
UPDATE "catalog_items" SET "type" = 'accessory' WHERE "type" NOT IN ('consumable', 'accessory');--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_type_check" CHECK ("catalog_items"."type" IN ('consumable', 'accessory'));