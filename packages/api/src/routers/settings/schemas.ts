import { z } from "zod";

export const ftpCredentialsSchema = z.object({
  host: z
    .string()
    .min(1)
    .refine(
      (val) => {
        try {
          new URL(val.includes("://") ? val : `ftp://${val}`);
          return true;
        } catch {
          const ipRegex =
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          return ipRegex.test(val);
        }
      },
      { message: "Укажите корректный хост (URL или IP)" },
    ),
  user: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9_.@-]+$/, {
      message: "Допустимые символы: латинские буквы, цифры, _, -, ., @",
    }),
  password: z.string().min(1, "Укажите пароль"),
});

const promptItemSchema = z.object({
  value: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const evaluationTemplateSlugSchema = z.enum([
  "sales",
  "support",
  "general",
]);

export const settingsUpdateSchema = z.object({
  deepseek_model: z.string().optional(),
  quality_min_value_threshold: z.number().min(0).max(5).optional(),
  enable_manager_recommendations: z.boolean().optional(),
  evaluation_default_template: evaluationTemplateSlugSchema.optional(),
  prompts: z.record(z.string(), promptItemSchema).optional(),
});

export const updateIntegrationsSchema = z.object({
  telegram_bot_token: z.string().optional().nullable(),
  max_bot_token: z.string().optional().nullable(),
});
