CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'starter', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."workspace_member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text,
	"timestamp" timestamp NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"actor" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"call_id" uuid NOT NULL,
	"is_quality_analyzable" boolean DEFAULT true,
	"not_analyzable_reason" text,
	"value_score" integer,
	"value_explanation" text,
	"manager_score" integer,
	"manager_feedback" text,
	"manager_breakdown" jsonb,
	"manager_recommendations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "call_evaluations_call_id_unique" UNIQUE("call_id")
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"filename" text,
	"number" text,
	"timestamp" timestamp with time zone NOT NULL,
	"name" text,
	"duration" integer,
	"direction" text,
	"status" text,
	"size_bytes" integer,
	"file_id" uuid,
	"internal_number" text,
	"source" text,
	"customer_name" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calls_workspace_filename_unique" UNIQUE("workspace_id","filename")
);
--> statement-breakpoint
CREATE TABLE "evaluation_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system_prompt" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_templates_workspace_slug_unique" UNIQUE("workspace_id","slug")
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"workspace_ids" jsonb,
	"user_ids" jsonb,
	"rollout_percentage" integer DEFAULT 0 NOT NULL,
	"conditions" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"file_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "workspace_member_role" DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"invited_by" text NOT NULL,
	"pending_settings" jsonb,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"accepted_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"stripe_invoice_id" text,
	"status" text NOT NULL,
	"amount_due" integer NOT NULL,
	"amount_paid" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"invoice_number" text,
	"invoice_pdf" text,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"due_date" timestamp,
	"paid_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_payment_method_id" text,
	"limits" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"call_id" uuid NOT NULL,
	"text" text,
	"raw_text" text,
	"title" text,
	"sentiment" text,
	"confidence" real,
	"summary" text,
	"size_kb" integer,
	"caller_name" text,
	"call_type" text,
	"call_topic" text,
	"metadata" jsonb,
	CONSTRAINT "transcripts_call_id_unique" UNIQUE("call_id")
);
--> statement-breakpoint
CREATE TABLE "usage_metrics" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"metric_type" text NOT NULL,
	"value" integer NOT NULL,
	"period" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usage_metrics_workspace_type_period_unique" UNIQUE("workspace_id","metric_type","period")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text,
	"bio" text,
	"language" text DEFAULT 'en',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"given_name" text,
	"family_name" text,
	"internal_extensions" text,
	"mobile_phones" text,
	"telegram_chat_id" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"active_workspace_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_workspace_settings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"notification_settings" jsonb DEFAULT '{
        "email": {"dailyReport": false, "weeklyReport": false, "monthlyReport": false},
        "telegram": {"dailyReport": false, "managerReport": false, "weeklyReport": false, "monthlyReport": false, "skipWeekends": false},
        "max": {"dailyReport": false, "managerReport": false}
      }'::jsonb NOT NULL,
	"report_settings" jsonb DEFAULT '{
        "includeCallSummaries": false,
        "detailed": false,
        "includeAvgValue": false,
        "includeAvgRating": false,
        "managedUserIds": []
      }'::jsonb NOT NULL,
	"kpi_settings" jsonb DEFAULT '{
        "baseSalary": 0,
        "targetBonus": 0,
        "targetTalkTimeMinutes": 0
      }'::jsonb NOT NULL,
	"filter_settings" jsonb DEFAULT '{
        "excludeAnsweringMachine": false,
        "minDuration": 0,
        "minReplicas": 0
      }'::jsonb NOT NULL,
	"evaluation_settings" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_workspace_settings_user_workspace_unique" UNIQUE("user_id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_integrations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"integration_type" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_integrations_workspace_type_unique" UNIQUE("workspace_id","integration_type")
);
--> statement-breakpoint
CREATE TABLE "workspace_pbx_employees" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"extension" text,
	"email" text,
	"first_name" text,
	"last_name" text,
	"display_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"raw_data" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_pbx_employees_workspace_provider_external_unique" UNIQUE("workspace_id","provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_pbx_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"target_type" text NOT NULL,
	"target_external_id" text NOT NULL,
	"user_id" text,
	"invitation_id" uuid,
	"link_source" text DEFAULT 'manual' NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"linked_by_user_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_pbx_links_workspace_provider_target_unique" UNIQUE("workspace_id","provider","target_type","target_external_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_pbx_numbers" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"employee_external_id" text,
	"phone_number" text NOT NULL,
	"extension" text,
	"label" text,
	"line_type" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"raw_data" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_pbx_numbers_workspace_provider_external_unique" UNIQUE("workspace_id","provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_pbx_sync_state" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"sync_type" text NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"cursor" text,
	"last_started_at" timestamp with time zone,
	"last_completed_at" timestamp with time zone,
	"last_successful_at" timestamp with time zone,
	"last_error" text,
	"stats" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_pbx_sync_state_workspace_provider_type_unique" UNIQUE("workspace_id","provider","sync_type")
);
--> statement-breakpoint
CREATE TABLE "workspace_pbx_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"event_id" text,
	"event_type" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_pbx_webhook_events_workspace_provider_event_unique" UNIQUE("workspace_id","provider","event_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_member_role" DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"invitation_token" text,
	"invitation_expires_at" timestamp,
	"invited_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_user_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_settings_workspace_key_unique" UNIQUE("workspace_id","key")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY DEFAULT workspace_id_generate() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_evaluations" ADD CONSTRAINT "call_evaluations_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_templates" ADD CONSTRAINT "evaluation_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_metrics" ADD CONSTRAINT "usage_metrics_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_active_workspace_id_workspaces_id_fk" FOREIGN KEY ("active_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_workspace_settings" ADD CONSTRAINT "user_workspace_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_workspace_settings" ADD CONSTRAINT "user_workspace_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD CONSTRAINT "workspace_integrations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_employees" ADD CONSTRAINT "workspace_pbx_employees_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_links" ADD CONSTRAINT "workspace_pbx_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_links" ADD CONSTRAINT "workspace_pbx_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_links" ADD CONSTRAINT "workspace_pbx_links_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_links" ADD CONSTRAINT "workspace_pbx_links_linked_by_user_id_users_id_fk" FOREIGN KEY ("linked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_numbers" ADD CONSTRAINT "workspace_pbx_numbers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_sync_state" ADD CONSTRAINT "workspace_pbx_sync_state_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_webhook_events" ADD CONSTRAINT "workspace_pbx_webhook_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_timestamp_idx" ON "activity_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "activity_log_workspace_id_idx" ON "activity_log" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "activity_log_workspace_timestamp_idx" ON "activity_log" USING btree ("workspace_id","timestamp");--> statement-breakpoint
CREATE INDEX "activity_log_level_idx" ON "activity_log" USING btree ("level");--> statement-breakpoint
CREATE INDEX "audit_log_workspace_idx" ON "audit_log" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource","resource_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_workspace_created_at_idx" ON "audit_log" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "call_evaluations_call_id_idx" ON "call_evaluations" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "call_evaluations_value_score_idx" ON "call_evaluations" USING btree ("value_score");--> statement-breakpoint
CREATE INDEX "call_evaluations_manager_score_idx" ON "call_evaluations" USING btree ("manager_score");--> statement-breakpoint
CREATE INDEX "calls_timestamp_idx" ON "calls" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "calls_internal_number_idx" ON "calls" USING btree ("internal_number");--> statement-breakpoint
CREATE INDEX "calls_workspace_id_idx" ON "calls" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "calls_workspace_timestamp_idx" ON "calls" USING btree ("workspace_id","timestamp");--> statement-breakpoint
CREATE INDEX "calls_workspace_archived_idx" ON "calls" USING btree ("workspace_id","is_archived");--> statement-breakpoint
CREATE INDEX "calls_number_idx" ON "calls" USING btree ("number");--> statement-breakpoint
CREATE INDEX "calls_status_idx" ON "calls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_calls_workspace_id_name_internal_number" ON "calls" USING btree ("workspace_id","name","internal_number");--> statement-breakpoint
CREATE INDEX "evaluation_templates_workspace_idx" ON "evaluation_templates" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "feature_flags_key_idx" ON "feature_flags" USING btree ("key");--> statement-breakpoint
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "files_workspace_id_idx" ON "files" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "files_file_type_idx" ON "files" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "files_storage_key_idx" ON "files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "files_workspace_file_type_idx" ON "files" USING btree ("workspace_id","file_type");--> statement-breakpoint
CREATE INDEX "files_created_at_idx" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invitations_workspace_idx" ON "invitations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitations_expires_at_idx" ON "invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "invitations_workspace_email_idx" ON "invitations" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "invoices_workspace_idx" ON "invoices" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "invoices_stripe_invoice_idx" ON "invoices" USING btree ("stripe_invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_period_idx" ON "invoices" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "subscriptions_workspace_idx" ON "subscriptions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_customer_idx" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_subscription_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "transcripts_call_id_idx" ON "transcripts" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "transcripts_call_type_idx" ON "transcripts" USING btree ("call_type");--> statement-breakpoint
CREATE INDEX "transcripts_sentiment_idx" ON "transcripts" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "usage_metrics_workspace_idx" ON "usage_metrics" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "usage_metrics_workspace_period_idx" ON "usage_metrics" USING btree ("workspace_id","period");--> statement-breakpoint
CREATE INDEX "usage_metrics_period_idx" ON "usage_metrics" USING btree ("period");--> statement-breakpoint
CREATE INDEX "user_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_workspace_settings_workspace_idx" ON "user_workspace_settings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "user_workspace_settings_user_idx" ON "user_workspace_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_workspace_settings_notification_gin_idx" ON "user_workspace_settings" USING gin ("notification_settings");--> statement-breakpoint
CREATE INDEX "user_workspace_settings_report_gin_idx" ON "user_workspace_settings" USING gin ("report_settings");--> statement-breakpoint
CREATE INDEX "workspace_integrations_workspace_id_idx" ON "workspace_integrations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_integrations_type_idx" ON "workspace_integrations" USING btree ("integration_type");--> statement-breakpoint
CREATE INDEX "workspace_integrations_workspace_type_idx" ON "workspace_integrations" USING btree ("workspace_id","integration_type");--> statement-breakpoint
CREATE INDEX "workspace_pbx_employees_workspace_idx" ON "workspace_pbx_employees" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_employees_provider_idx" ON "workspace_pbx_employees" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "workspace_pbx_employees_extension_idx" ON "workspace_pbx_employees" USING btree ("extension");--> statement-breakpoint
CREATE INDEX "workspace_pbx_employees_email_idx" ON "workspace_pbx_employees" USING btree ("email");--> statement-breakpoint
CREATE INDEX "workspace_pbx_links_workspace_idx" ON "workspace_pbx_links" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_links_provider_idx" ON "workspace_pbx_links" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "workspace_pbx_links_user_idx" ON "workspace_pbx_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_links_invitation_idx" ON "workspace_pbx_links" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_numbers_workspace_idx" ON "workspace_pbx_numbers" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_numbers_provider_idx" ON "workspace_pbx_numbers" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "workspace_pbx_numbers_phone_idx" ON "workspace_pbx_numbers" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "workspace_pbx_numbers_extension_idx" ON "workspace_pbx_numbers" USING btree ("extension");--> statement-breakpoint
CREATE INDEX "workspace_pbx_sync_state_workspace_idx" ON "workspace_pbx_sync_state" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_sync_state_provider_idx" ON "workspace_pbx_sync_state" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "workspace_pbx_sync_state_status_idx" ON "workspace_pbx_sync_state" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspace_pbx_webhook_events_workspace_idx" ON "workspace_pbx_webhook_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_webhook_events_provider_idx" ON "workspace_pbx_webhook_events" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "workspace_pbx_webhook_events_type_idx" ON "workspace_pbx_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "workspace_pbx_webhook_events_status_idx" ON "workspace_pbx_webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_id_idx" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_status_idx" ON "workspace_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspace_members_invitation_token_idx" ON "workspace_members" USING btree ("invitation_token");--> statement-breakpoint
CREATE INDEX "workspace_settings_key_idx" ON "workspace_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "workspace_settings_workspace_idx" ON "workspace_settings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspaces_slug_idx" ON "workspaces" USING btree ("slug");