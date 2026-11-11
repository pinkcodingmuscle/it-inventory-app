ALTER TABLE "users" DROP CONSTRAINT "users_status_check";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("users"."status" IN ('active', 'inactive', 'pending'));