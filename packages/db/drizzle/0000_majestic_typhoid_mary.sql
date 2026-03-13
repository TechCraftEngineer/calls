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
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"actor" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"callId" integer NOT NULL,
	"isQualityAnalyzable" boolean DEFAULT true,
	"notAnalyzableReason" text,
	"valueScore" integer,
	"valueExplanation" text,
	"managerScore" integer,
	"managerFeedback" text,
	"managerBreakdown" text,
	"managerRecommendations" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "call_evaluations_callId_unique" UNIQUE("callId")
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"filename" text,
	"number" text,
	"timestamp" timestamp NOT NULL,
	"name" text,
	"duration" integer,
	"direction" text,
	"status" text,
	"sizeBytes" integer,
	"internalNumber" text,
	"source" text,
	"customerName" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calls_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
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
	"id" serial PRIMARY KEY NOT NULL,
	"callId" integer NOT NULL,
	"text" text,
	"rawText" text,
	"title" text,
	"sentiment" text,
	"confidence" real,
	"summary" text,
	"sizeKb" integer,
	"callerName" text,
	"callType" text,
	"callTopic" text
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
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"userId" text NOT NULL,
	"role" "workspace_member_role" DEFAULT 'member' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_user_unique" UNIQUE("workspaceId","userId")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_evaluations" ADD CONSTRAINT "call_evaluations_callId_calls_id_fk" FOREIGN KEY ("callId") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_callId_calls_id_fk" FOREIGN KEY ("callId") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_timestamp_idx" ON "activity_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "activity_log_workspace_id_idx" ON "activity_log" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "activity_log_workspace_timestamp_idx" ON "activity_log" USING btree ("workspaceId","timestamp");--> statement-breakpoint
CREATE INDEX "activity_log_level_idx" ON "activity_log" USING btree ("level");--> statement-breakpoint
CREATE INDEX "call_evaluations_call_id_idx" ON "call_evaluations" USING btree ("callId");--> statement-breakpoint
CREATE INDEX "call_evaluations_value_score_idx" ON "call_evaluations" USING btree ("valueScore");--> statement-breakpoint
CREATE INDEX "call_evaluations_manager_score_idx" ON "call_evaluations" USING btree ("managerScore");--> statement-breakpoint
CREATE INDEX "calls_timestamp_idx" ON "calls" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "calls_internal_number_idx" ON "calls" USING btree ("internalNumber");--> statement-breakpoint
CREATE INDEX "calls_workspace_id_idx" ON "calls" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "calls_workspace_timestamp_idx" ON "calls" USING btree ("workspaceId","timestamp");--> statement-breakpoint
CREATE INDEX "calls_number_idx" ON "calls" USING btree ("number");--> statement-breakpoint
CREATE INDEX "prompts_key_idx" ON "prompts" USING btree ("key");--> statement-breakpoint
CREATE INDEX "prompts_workspace_id_idx" ON "prompts" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "prompts_workspace_key_idx" ON "prompts" USING btree ("workspaceId","key");--> statement-breakpoint
CREATE INDEX "transcripts_call_id_idx" ON "transcripts" USING btree ("callId");--> statement-breakpoint
CREATE INDEX "transcripts_call_type_idx" ON "transcripts" USING btree ("callType");--> statement-breakpoint
CREATE INDEX "transcripts_sentiment_idx" ON "transcripts" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_id_idx" ON "workspace_members" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_user_idx" ON "workspace_members" USING btree ("workspaceId","userId");--> statement-breakpoint
CREATE INDEX "workspaces_slug_idx" ON "workspaces" USING btree ("slug");