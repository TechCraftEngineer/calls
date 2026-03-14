ALTER TABLE "users" ADD COLUMN "email_daily_report" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_weekly_report" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_monthly_report" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_daily_report" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_manager_report" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_weekly_report" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_monthly_report" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_skip_weekends" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "max_chat_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "max_daily_report" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "max_manager_report" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "max_connect_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "report_include_call_summaries" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "report_detailed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "report_include_avg_value" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "report_include_avg_rating" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "report_managed_user_ids" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kpi_base_salary" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kpi_target_bonus" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kpi_target_talk_time_minutes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "filter_exclude_answering_machine" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "filter_min_duration" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "filter_min_replicas" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_connect_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;