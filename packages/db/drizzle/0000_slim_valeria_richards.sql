CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" text NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"actor" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_id" integer NOT NULL,
	"is_quality_analyzable" boolean DEFAULT true,
	"not_analyzable_reason" text,
	"value_score" integer,
	"value_explanation" text,
	"manager_score" integer,
	"manager_feedback" text,
	"manager_breakdown" text,
	"manager_recommendations" text,
	"created_at" text NOT NULL,
	CONSTRAINT "call_evaluations_call_id_unique" UNIQUE("call_id")
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text,
	"number" text,
	"timestamp" text NOT NULL,
	"name" text,
	"duration" integer,
	"direction" text,
	"status" text,
	"size_bytes" integer,
	"internal_number" text,
	"source" text,
	"customer_name" text,
	CONSTRAINT "calls_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" text,
	CONSTRAINT "prompts_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_id" integer NOT NULL,
	"text" text,
	"raw_text" text,
	"title" text,
	"sentiment" text,
	"confidence" real,
	"summary" text,
	"size_kb" integer,
	"caller_name" text,
	"call_type" text,
	"call_topic" text
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
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
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
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call_evaluations" ADD CONSTRAINT "call_evaluations_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_timestamp_idx" ON "activity_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "call_evaluations_call_id_idx" ON "call_evaluations" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "call_evaluations_value_score_idx" ON "call_evaluations" USING btree ("value_score");--> statement-breakpoint
CREATE INDEX "calls_timestamp_idx" ON "calls" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "calls_internal_number_idx" ON "calls" USING btree ("internal_number");--> statement-breakpoint
CREATE INDEX "prompts_key_idx" ON "prompts" USING btree ("key");--> statement-breakpoint
CREATE INDEX "transcripts_call_id_idx" ON "transcripts" USING btree ("call_id");