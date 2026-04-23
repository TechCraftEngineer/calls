CREATE TABLE "workspace_pbx_employee_report_settings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"employee_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text,
	"daily_report" boolean DEFAULT false NOT NULL,
	"weekly_report" boolean DEFAULT false NOT NULL,
	"monthly_report" boolean DEFAULT false NOT NULL,
	"skip_weekends" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_pbx_employee_report_settings_employee_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_pbx_employee_report_settings" ADD CONSTRAINT "workspace_pbx_employee_report_settings_employee_id_workspace_pbx_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workspace_pbx_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_employee_report_settings" ADD CONSTRAINT "workspace_pbx_employee_report_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_pbx_employee_report_settings_employee_idx" ON "workspace_pbx_employee_report_settings" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_employee_report_settings_workspace_idx" ON "workspace_pbx_employee_report_settings" USING btree ("workspace_id");