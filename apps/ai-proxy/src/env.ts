import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    /** OpenAI API — для chat, embeddings, Whisper */
    OPENAI_API_KEY: z.string().min(1).optional(),
    /** AssemblyAI — для транскрибации аудио */
    ASSEMBLYAI_API_KEY: z.string().min(1).optional(),
    /** OpenRouter — для chat completions через разные модели */
    OPENROUTER_API_KEY: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
  },
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
});
