-- Migration: Add workspace_pbx_employee_report_settings table
-- Description: Table for storing email report settings for PBX employees

CREATE TABLE IF NOT EXISTS "workspace_pbx_employee_report_settings" (
    "id" uuid PRIMARY KEY DEFAULT uuidv7(),
    "employee_id" uuid NOT NULL REFERENCES "workspace_pbx_employees"("id") ON DELETE CASCADE,
    "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "email" text,
    "daily_report" boolean NOT NULL DEFAULT false,
    "weekly_report" boolean NOT NULL DEFAULT false,
    "monthly_report" boolean NOT NULL DEFAULT false,
    "skip_weekends" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "workspace_pbx_employee_report_settings_employee_idx" 
    ON "workspace_pbx_employee_report_settings"("employee_id");

CREATE INDEX IF NOT EXISTS "workspace_pbx_employee_report_settings_workspace_idx" 
    ON "workspace_pbx_employee_report_settings"("workspace_id");

-- Unique constraint: one settings record per employee
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_pbx_employee_report_settings_employee_unique" 
    ON "workspace_pbx_employee_report_settings"("employee_id");

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_workspace_pbx_employee_report_settings_updated_at 
    ON "workspace_pbx_employee_report_settings";

CREATE TRIGGER update_workspace_pbx_employee_report_settings_updated_at
    BEFORE UPDATE ON "workspace_pbx_employee_report_settings"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
