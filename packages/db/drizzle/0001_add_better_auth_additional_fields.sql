-- Standard field names for Better Auth user (OIDC + domain naming)
-- given_name, family_name — OIDC; internal_extensions — telephony; mobile_phones; telegram_chat_id
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "given_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "family_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "internal_extensions" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mobile_phones" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_chat_id" text;
