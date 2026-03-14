import { ORPCError } from "@orpc/server";
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
      { message: "Некорректный формат хоста (URL или IP)" },
    ),
  user: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/, {
      message: "Имя пользователя может содержать только буквы, цифры, _, -, .",
    }),
  password: z.string().min(1, "Пароль обязателен"),
});

const promptItemSchema = z.object({
  value: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const settingsUpdateSchema = z
  .object({
    deepseek_model: z.string().optional(),
    quality_min_value_threshold: z.number().min(0).max(5).optional(),
    enable_manager_recommendations: z.boolean().optional(),
    telegram_bot_token: z.string().optional().nullable(),
    max_bot_token: z.string().optional().nullable(),
    megafon_ftp_host: z.string().optional().nullable(),
    megafon_ftp_user: z.string().optional().nullable(),
    megafon_ftp_password: z.string().optional().nullable(),
    prompts: z.record(z.string(), promptItemSchema).optional(),
  })
  .refine((data) => {
    const ftpFields = [
      data.megafon_ftp_host,
      data.megafon_ftp_user,
      data.megafon_ftp_password,
    ];
    const hasAnyValue = ftpFields.some((field) => field && field.trim() !== "");
    const hasAllValues = ftpFields.every(
      (field) => field && field.trim() !== "",
    );

    if (hasAnyValue && !hasAllValues) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Все поля FTP должны быть заполнены",
      });
    }

    return true;
  });
