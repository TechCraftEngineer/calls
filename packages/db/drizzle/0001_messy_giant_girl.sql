-- ALTER TYPE "public"."call_status" ADD VALUE IF NOT EXISTS 'technical_error';--> statement-breakpoint
-- NOTE: Execute manually: ALTER TYPE "public"."call_status" ADD VALUE IF NOT EXISTS 'technical_error';
ALTER TABLE "calls" DROP CONSTRAINT "calls_status_check";--> statement-breakpoint
CREATE INDEX "calls_direction_idx" ON "calls" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "calls_workspace_direction_idx" ON "calls" USING btree ("workspace_id","direction");--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_status_check" CHECK (status IN ('missed', 'answered', 'voicemail', 'failed', 'technical_error'));