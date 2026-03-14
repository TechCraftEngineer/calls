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
	"workspace_id" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"actor" text NOT NULL
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
	"timestamp" timestamp NOT NULL,
	"name" text,
	"duration" integer,
	"direction" text,
	"status" text,
	"size_bytes" integer,
	"file_id" uuid,
	"internal_number" text,
	"source" text,
	"customer_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calls_filename_unique" UNIQUE("filename")
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
CREATE TABLE "prompts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prompts_key_unique" UNIQUE("key")
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
	"metadata" jsonb
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
	CONSTRAINT "users_email_unique" UNIQUE("email")
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
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_member_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_user_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY DEFAULT workspace_id_generate() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_evaluations" ADD CONSTRAINT "call_evaluations_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_timestamp_idx" ON "activity_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "activity_log_workspace_id_idx" ON "activity_log" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "activity_log_workspace_timestamp_idx" ON "activity_log" USING btree ("workspace_id","timestamp");--> statement-breakpoint
CREATE INDEX "activity_log_level_idx" ON "activity_log" USING btree ("level");--> statement-breakpoint
CREATE INDEX "call_evaluations_call_id_idx" ON "call_evaluations" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "call_evaluations_value_score_idx" ON "call_evaluations" USING btree ("value_score");--> statement-breakpoint
CREATE INDEX "call_evaluations_manager_score_idx" ON "call_evaluations" USING btree ("manager_score");--> statement-breakpoint
CREATE INDEX "calls_timestamp_idx" ON "calls" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "calls_internal_number_idx" ON "calls" USING btree ("internal_number");--> statement-breakpoint
CREATE INDEX "calls_workspace_id_idx" ON "calls" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "calls_workspace_timestamp_idx" ON "calls" USING btree ("workspace_id","timestamp");--> statement-breakpoint
CREATE INDEX "calls_number_idx" ON "calls" USING btree ("number");--> statement-breakpoint
CREATE INDEX "calls_status_idx" ON "calls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "files_workspace_id_idx" ON "files" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "files_file_type_idx" ON "files" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "files_storage_key_idx" ON "files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "files_workspace_file_type_idx" ON "files" USING btree ("workspace_id","file_type");--> statement-breakpoint
CREATE INDEX "files_created_at_idx" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "prompts_key_idx" ON "prompts" USING btree ("key");--> statement-breakpoint
CREATE INDEX "prompts_workspace_id_idx" ON "prompts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "prompts_workspace_key_idx" ON "prompts" USING btree ("workspace_id","key");--> statement-breakpoint
CREATE INDEX "transcripts_call_id_idx" ON "transcripts" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "transcripts_call_type_idx" ON "transcripts" USING btree ("call_type");--> statement-breakpoint
CREATE INDEX "transcripts_sentiment_idx" ON "transcripts" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_id_idx" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspaces_slug_idx" ON "workspaces" USING btree ("slug");