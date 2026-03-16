import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    DEEPSEEK_API_KEY: z.string().optional(),
    AI_MODEL: z.string().default("gpt-3.5-turbo"),
    AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
    AI_MAX_TOKENS: z.coerce.number().min(1).max(4000).default(1000),
    /** openai | openrouter | deepseek */
    AI_PROVIDER: z.enum(["openai", "openrouter", "deepseek"]).default("openai"),
    LANGFUSE_SECRET_KEY: z.string().optional(),
    LANGFUSE_PUBLIC_KEY: z.string().optional(),
    LANGFUSE_BASEURL: z.string().optional(),

    // Node environment
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),

    // Vercel
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
    VERCEL_URL: z.string().optional(),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

    // Database
    POSTGRES_URL: z.url(),

    // App
    APP_URL: z.string().default("http://localhost:3000"),

    // Email
    RESEND_API_KEY: z.string().optional(),
    EMAIL_SANDBOX_ENABLED: z.coerce.boolean().optional().default(false),
    EMAIL_SANDBOX_HOST: z.string().default("localhost"),
    EMAIL_FROM: z.string().default("QBS Звонки <support@qbsoft.ru>"),

    // Auth
    BETTER_AUTH_SECRET: z.string().optional(),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),

    // Megafon PBX FTP
    MEGAFON_FTP_HOST: z.string().optional(),
    MEGAFON_FTP_USER: z.string().optional(),
    MEGAFON_FTP_PASSWORD: z.string().optional(),

    // ASR (Speech-to-Text) - at least one required
    ASSEMBLYAI_API_KEY: z.string().optional(),
    YANDEX_SPEECHKIT_API_KEY: z.string().optional(),

    // File processing limits
    MIN_FILE_SIZE_BYTES: z.coerce.number().default(1024), // 1KB
    MAX_FILE_SIZE_BYTES: z.coerce.number().default(100 * 1024 * 1024), // 100MB

    // Inngest
    INNGEST_SIGNING_KEY: z.string().optional(),
    INNGEST_EVENT_KEY: z.string().optional(),

    // AWS S3
    AWS_S3_ENDPOINT: z.string().optional(),
    AWS_S3_FORCE_PATH_STYLE: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().default("us-east-1"),
    AWS_S3_BUCKET: z.string().default("qbs-calls"),
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().default("QBS Звонки"),
    NEXT_PUBLIC_APP_SHORT_NAME: z.string().default("Звонки"),
    NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  },
  clientPrefix: "NEXT_PUBLIC_",
  runtimeEnv: {
    AI_MODEL: process.env.AI_MODEL,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_TEMPERATURE: process.env.AI_TEMPERATURE,
    AI_MAX_TOKENS: process.env.AI_MAX_TOKENS,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
    APP_URL: process.env.APP_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_SANDBOX_ENABLED: process.env.EMAIL_SANDBOX_ENABLED === "true",
    EMAIL_SANDBOX_HOST: process.env.EMAIL_SANDBOX_HOST,
    EMAIL_FROM: process.env.EMAIL_FROM,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    MEGAFON_FTP_HOST: process.env.MEGAFON_FTP_HOST,
    MEGAFON_FTP_USER: process.env.MEGAFON_FTP_USER,
    MEGAFON_FTP_PASSWORD: process.env.MEGAFON_FTP_PASSWORD,
    ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY,
    YANDEX_SPEECHKIT_API_KEY: process.env.YANDEX_SPEECHKIT_API_KEY,
    MIN_FILE_SIZE_BYTES: process.env.MIN_FILE_SIZE_BYTES,
    MAX_FILE_SIZE_BYTES: process.env.MAX_FILE_SIZE_BYTES,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT,
    AWS_S3_FORCE_PATH_STYLE: process.env.AWS_S3_FORCE_PATH_STYLE,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_SHORT_NAME: process.env.NEXT_PUBLIC_APP_SHORT_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_BASEURL:
      process.env.LANGFUSE_BASEURL ?? process.env.LANGFUSE_BASE_URL,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});

// Валидация: хотя бы один ASR провайдер должен быть настроен
const hasAnyAsrProvider = !!(
  env.ASSEMBLYAI_API_KEY || env.YANDEX_SPEECHKIT_API_KEY
);
const skipValidation =
  !!process.env.CI ||
  process.env.npm_lifecycle_event === "lint" ||
  process.env.npm_lifecycle_event === "build" ||
  process.env.NEXT_PHASE === "phase-production-build";

if (!hasAnyAsrProvider && process.env.NODE_ENV !== "test" && !skipValidation) {
  console.warn(
    "Внимание: Настройте хотя бы один ASR провайдер: ASSEMBLYAI_API_KEY или YANDEX_SPEECHKIT_API_KEY",
  );
}
