import { promptsService, settingsService, systemRepository } from "@calls/db";
import { z } from "zod";
import {
  workspaceAdminProcedure,
  workspaceMemberProcedure,
  workspaceProcedure,
} from "../orpc";

// Список чувствительных ключей для маскирования в логах
const SENSITIVE_KEYS = [
  "telegram_bot_token",
  "max_bot_token",
  "megafon_ftp_password",
  "password",
  "token",
  "secret",
  "key",
];

// Функция для маскирования чувствительных данных в логах
function maskSensitiveData(key: string, value: string): string {
  return SENSITIVE_KEYS.some((sensitive) =>
    key.toLowerCase().includes(sensitive),
  )
    ? `${value.substring(0, 3)}***`
    : value;
}

const DEEPSEEK_MODELS: Record<string, { name: string; max_tokens: number }> = {
  "deepseek-chat": { name: "DeepSeek Chat", max_tokens: 8192 },
  "deepseek-coder": { name: "DeepSeek Coder", max_tokens: 8192 },
};

// Валидация для FTP credentials
const ftpCredentialsSchema = z.object({
  host: z
    .string()
    .min(1)
    .refine(
      (val) => {
        // Проверяем URL или IP формат
        try {
          new URL(val.includes("://") ? val : `ftp://${val}`);
          return true;
        } catch {
          // Проверяем IP формат
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

const settingsUpdateSchema = z
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
    // Если хотя бы одно FTP поле заполнено, все должны быть заполнены
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
      throw new Error("Все поля FTP должны быть заполнены");
    }

    return true;
  });

export const settingsRouter = {
  getPrompts: workspaceProcedure.handler(async ({ context }) => {
    return await promptsService.getAllPrompts(context.workspaceId);
  }),

  updatePrompts: workspaceAdminProcedure
    .input(settingsUpdateSchema)
    .handler(async ({ input, context }) => {
      const { workspaceId } = context;
      if (input.deepseek_model && input.deepseek_model in DEEPSEEK_MODELS) {
        await promptsService.updatePrompt(
          "deepseek_model",
          input.deepseek_model,
          "Selected DeepSeek model",
          workspaceId,
        );
      }
      if (input.quality_min_value_threshold !== undefined) {
        await promptsService.updatePrompt(
          "quality_min_value_threshold",
          String(input.quality_min_value_threshold),
          "Minimum call value for quality evaluation (0-5)",
          workspaceId,
        );
      }
      if (input.enable_manager_recommendations !== undefined) {
        await promptsService.updatePrompt(
          "enable_manager_recommendations",
          input.enable_manager_recommendations ? "true" : "false",
          "Включить генерацию рекомендаций для менеджера (true/false)",
          workspaceId,
        );
      }
      if (input.telegram_bot_token !== undefined) {
        await promptsService.updatePrompt(
          "telegram_bot_token",
          input.telegram_bot_token ?? "",
          "Telegram Bot Token",
          workspaceId,
        );
      }
      if (input.max_bot_token !== undefined) {
        await promptsService.updatePrompt(
          "max_bot_token",
          input.max_bot_token ?? "",
          "MAX Bot Token",
          workspaceId,
        );
      }
      if (
        input.megafon_ftp_host !== undefined ||
        input.megafon_ftp_user !== undefined ||
        input.megafon_ftp_password !== undefined
      ) {
        // Валидируем FTP credentials если они предоставлены
        if (
          input.megafon_ftp_host &&
          input.megafon_ftp_user &&
          input.megafon_ftp_password
        ) {
          try {
            ftpCredentialsSchema.parse({
              host: input.megafon_ftp_host,
              user: input.megafon_ftp_user,
              password: input.megafon_ftp_password,
            });
          } catch (error) {
            throw new Error(
              `Ошибка валидации FTP: ${(error as Error).message}`,
            );
          }

          // Используем новый сервис для обновления FTP настроек
          await settingsService.updateMegafonFtpSettings(
            input.megafon_ftp_host,
            input.megafon_ftp_user,
            input.megafon_ftp_password,
            workspaceId,
          );
        }
      }
      if (input.prompts) {
        const promptKeys = [
          "summary",
          "transcribe_incoming",
          "transcribe_outgoing",
          "speaker_analysis",
          "speaker_analysis_incoming",
          "speaker_analysis_outgoing",
          "value_incoming",
          "value_outgoing",
          "quality",
          "manager_recommendations",
          "report_daily_time",
          "report_weekly_day",
          "report_weekly_time",
          "report_monthly_day",
          "report_monthly_time",
        ];
        for (const key of promptKeys) {
          const p = input.prompts[key] as
            | { value?: string; description?: string }
            | undefined;
          if (p) {
            await promptsService.updatePrompt(
              key,
              p.value ?? "",
              p.description ?? "",
              workspaceId,
            );
            // Маскируем чувствительные данные в логах
            const maskedValue = maskSensitiveData(key, p.value ?? "");
            await systemRepository.addActivityLog(
              "info",
              `Prompt updated: ${key} = ${maskedValue}`,
              (context.user as Record<string, unknown>).username as string,
              workspaceId,
            );
          }
        }
        const tb = input.prompts.telegram_bot_token as
          | { value?: string }
          | undefined;
        if (tb)
          await promptsService.updatePrompt(
            "telegram_bot_token",
            tb.value ?? "",
            "Telegram Bot Token",
            workspaceId,
          );
        const mb = input.prompts.max_bot_token as
          | { value?: string }
          | undefined;
        if (mb)
          await promptsService.updatePrompt(
            "max_bot_token",
            mb.value ?? "",
            "MAX Bot Token",
            workspaceId,
          );
      }
      return { success: true, message: "Settings updated successfully" };
    }),

  getModels: workspaceProcedure.handler(async ({ context }) => {
    const current = await promptsService.getPrompt(
      "deepseek_model",
      context.workspaceId,
      "deepseek-chat",
    );
    return { models: DEEPSEEK_MODELS, current_model: current };
  }),

  backup: workspaceAdminProcedure.handler(async ({ context }) => {
    // PostgreSQL: run pg_dump externally for backup:
    // pg_dump $POSTGRES_URL > backup_$(date +%Y%m%d_%H%M%S).sql
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(0, 15);
    const backupFilename = `pg_backup_${timestamp}.sql`;
    await systemRepository.addActivityLog(
      "info",
      `Запрошена резервная копия PostgreSQL: ${backupFilename} (выполните pg_dump вручную)`,
      (context.user as Record<string, unknown>).username as string,
      context.workspaceId,
    );
    return {
      success: true,
      message: "Резервная копия: выполните pg_dump $POSTGRES_URL > backup.sql",
      path: backupFilename,
    };
  }),
};
