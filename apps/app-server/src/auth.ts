/**
 * Better Auth configuration for backend-server.
 * Uses PostgreSQL + email/password for calls app authentication.
 */

import { db } from "@calls/db";
import * as schema from "@calls/db/schema";
import { ResetPasswordEmail, sendEmail } from "@calls/emails";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

// BETTER_AUTH_URL / baseURL — публичный URL приложения (для ссылок в письмах, OAuth callback)
const publicBaseUrl =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.APP_URL ??
  "http://localhost:3000";

const trustedOrigins = [
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_APP_URL,
  ...(process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
  "https://zvonki.qbsoft.ru",
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
  baseURL: publicBaseUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: [user.email],
        subject: "Сброс пароля — QBS Звонки",
        react: ResetPasswordEmail({ resetLink: url }),
      }).catch((error) => {
        console.error("[Auth] Failed to send password reset email:", {
          email: user.email,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    },
  },
  socialProviders:
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? {
          google: {
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            redirectURI: `${publicBaseUrl}/api/auth/callback/google`,
          },
        }
      : undefined,
  plugins: [
    admin({
      defaultRole: "user",
    }),
  ],
  session: {
    // Позволяет удалять аккаунт без ввода пароля (подтверждение фразой в UI)
    freshAge: 60 * 60 * 24 * 30, // 30 дней — сессия считается «свежей»
  },
  user: {
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      givenName: { type: "string", required: false },
      familyName: { type: "string", required: false },
      internalExtensions: { type: "string", required: false },
      mobilePhones: { type: "string", required: false },
      telegramChatId: { type: "string", required: false },
    },
  },
});

// Infer types from Better Auth configuration
export type Session = typeof auth.$Infer.Session;
export type User = (typeof auth.$Infer.Session)["user"];
export type Auth = typeof auth;
