ALTER TABLE "invitations" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "invitation_type" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
CREATE INDEX "invitations_type_idx" ON "invitations" USING btree ("invitation_type");