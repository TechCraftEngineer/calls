-- Add invitation_type column to invitations table
-- 'email' - invitation sent to specific email (existing behavior)
-- 'link' - open invitation link that anyone can use

ALTER TABLE "invitations" ADD COLUMN "invitation_type" text DEFAULT 'email' NOT NULL;
--> statement-breakpoint

-- Make email nullable for link-based invitations
ALTER TABLE "invitations" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint

-- Add check constraint to ensure email is provided for email-type invitations and NULL for link-type
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_email_required_for_email_type" 
  CHECK (
    (invitation_type = 'email' AND email IS NOT NULL) OR 
    (invitation_type = 'link' AND email IS NULL)
  );
--> statement-breakpoint

-- Add index for invitation_type
CREATE INDEX "invitations_type_idx" ON "invitations" ("invitation_type");
