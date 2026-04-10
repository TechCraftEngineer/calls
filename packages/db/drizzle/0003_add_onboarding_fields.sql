ALTER TABLE "workspaces" ADD COLUMN "name_en" text;
ALTER TABLE "workspaces" ADD COLUMN "is_onboarded" boolean DEFAULT false NOT NULL;
