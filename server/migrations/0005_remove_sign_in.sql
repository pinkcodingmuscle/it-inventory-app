ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_status_check";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";--> statement-breakpoint
-- Sign-up requests that were never approved can't stay "pending" once that status is removed.
UPDATE "users" SET "status" = 'inactive' WHERE "status" = 'pending';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("users"."status" IN ('active', 'inactive'));