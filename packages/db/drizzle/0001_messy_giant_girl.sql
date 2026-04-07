-- Добавляем значение 'technical_error' в enum call_status
-- Безопасно выполнять многократно благодаря IF NOT EXISTS
ALTER TYPE "public"."call_status" ADD VALUE IF NOT EXISTS 'technical_error';--> statement-breakpoint

-- Примечание: ALTER TYPE в PostgreSQL нельзя выполнить внутри транзакции с другими DDL операциями,
-- поэтому Drizzle может требовать ручного выполнения при некоторых конфигурациях.
-- При ошибке "ALTER TYPE cannot be executed within a transaction block" выполните вручную:
--   ALTER TYPE "public"."call_status" ADD VALUE IF NOT EXISTS 'technical_error';

ALTER TABLE "calls" DROP CONSTRAINT "calls_status_check";--> statement-breakpoint
CREATE INDEX "calls_direction_idx" ON "calls" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "calls_workspace_direction_idx" ON "calls" USING btree ("workspace_id","direction");--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_status_check" CHECK (status IN ('missed', 'answered', 'voicemail', 'failed', 'technical_error'));