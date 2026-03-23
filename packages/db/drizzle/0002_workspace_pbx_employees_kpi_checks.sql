BEGIN;

ALTER TABLE "workspace_pbx_employees"
ADD CONSTRAINT "workspace_pbx_employees_kpi_base_salary_non_negative"
CHECK ("kpi_base_salary" >= 0);

ALTER TABLE "workspace_pbx_employees"
ADD CONSTRAINT "workspace_pbx_employees_kpi_target_bonus_non_negative"
CHECK ("kpi_target_bonus" >= 0);

ALTER TABLE "workspace_pbx_employees"
ADD CONSTRAINT "workspace_pbx_employees_kpi_target_talk_time_non_negative"
CHECK ("kpi_target_talk_time_minutes" >= 0);

COMMIT;
