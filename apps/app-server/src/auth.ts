/**
 * Better Auth configuration for backend-server.
 * Uses PostgreSQL + username plugin for calls app authentication.
 */

import { db } from "@calls/db";
import * as schema from "@calls/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";

const baseUrl =
  process.env.BACKEND_URL ?? process.env.APP_URL ?? "http://localhost:7000";

const trustedOrigins = [
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_APP_URL,
  ...(process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
  "https://zvonki.qbs.ru",
].filter(Boolean) as string[];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      account: schema.account,
      session: schema.session,
      verification: schema.verification,
    },
  }),
  baseURL: baseUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [username()],
  user: {
    additionalFields: {
      internal_numbers: { type: "string", required: false },
      mobile_numbers: { type: "string", required: false },
      telegram_chat_id: { type: "string", required: false },
      first_name: { type: "string", required: false },
      last_name: { type: "string", required: false },
    },
  },
});

export type Auth = typeof auth;
