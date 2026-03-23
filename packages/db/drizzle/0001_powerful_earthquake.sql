ALTER TABLE "workspace_pbx_employees" ADD COLUMN "kpi_base_salary" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_pbx_employees" ADD COLUMN "kpi_target_bonus" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_pbx_employees" ADD COLUMN "kpi_target_talk_time_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_pbx_employees" ADD CONSTRAINT "workspace_pbx_employees_kpi_base_salary_non_negative" CHECK ("workspace_pbx_employees"."kpi_base_salary" >= 0);--> statement-breakpoint
ALTER TABLE "workspace_pbx_employees" ADD CONSTRAINT "workspace_pbx_employees_kpi_target_bonus_non_negative" CHECK ("workspace_pbx_employees"."kpi_target_bonus" >= 0);--> statement-breakpoint
ALTER TABLE "workspace_pbx_employees" ADD CONSTRAINT "workspace_pbx_employees_kpi_target_talk_time_non_negative" CHECK ("workspace_pbx_employees"."kpi_target_talk_time_minutes" >= 0);