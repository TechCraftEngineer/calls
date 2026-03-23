ALTER TABLE "workspace_pbx_employees"
ADD COLUMN "kpi_base_salary" integer DEFAULT 0 NOT NULL;

ALTER TABLE "workspace_pbx_employees"
ADD COLUMN "kpi_target_bonus" integer DEFAULT 0 NOT NULL;

ALTER TABLE "workspace_pbx_employees"
ADD COLUMN "kpi_target_talk_time_minutes" integer DEFAULT 0 NOT NULL;
