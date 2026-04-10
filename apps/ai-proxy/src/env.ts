import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    /** OpenRouter — для chat completions через разные модели */
    OPENROUTER_API_KEY: z.string().optional(),
  },
  runtimeEnv: {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  },
});
