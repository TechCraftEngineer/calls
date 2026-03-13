import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
  },
  server: {
    PORT: z.coerce.number().default(3000),
    VERCEL_URL: z.string().optional(),
    POSTGRES_URL: z.string(),
    AUTH_SECRET: z.string(),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    EMAIL_SANDBOX_ENABLED: z.boolean().default(true),
    EMAIL_SANDBOX_HOST: z.string().default("localhost"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_APP_NAME: z.string().default("Calls"),
    NEXT_PUBLIC_APP_SHORT_NAME: z.string().default("Calls"),
  },
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_SHORT_NAME: process.env.NEXT_PUBLIC_APP_SHORT_NAME,
    VERCEL_ENV: process.env.VERCEL_ENV,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
