import { promptsService, systemRepository } from "@calls/db";
import { z } from "zod";
import { adminProcedure, protectedProcedure } from "../orpc";

const DEEPSEEK_MODELS: Record<string, { name: string; max_tokens: number }> = {
  "deepseek-chat": { name: "DeepSeek Chat", max_tokens: 8192 },
  "deepseek-coder": { name: "DeepSeek Coder", max_tokens: 8192 },
};

const promptItemSchema = z.object({
  value: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const settingsUpdateSchema = z.object({
  deepseek_model: z.string().optional(),
  quality_min_value_threshold: z.number().min(0).max(5).optional(),
  enable_manager_recommendations: z.boolean().optional(),
  telegram_bot_token: z.string().optional().nullable(),
  max_bot_token: z.string().optional().nullable(),
  prompts: z.record(z.string(), promptItemSchema).optional(),
});

export const settingsRouter = {
  getPrompts: protectedProcedure.handler(async () => {
    return await promptsService.getAllPrompts();
  }),

  updatePrompts: adminProcedure
    .input(settingsUpdateSchema)
    .handler(async ({ input, context }) => {
      if (input.deepseek_model && input.deepseek_model in DEEPSEEK_MODELS) {
        await promptsService.updatePrompt(
          "deepseek_model",
          input.deepseek_model,
          "Selected DeepSeek model",
        );
      }
      if (input.quality_min_value_threshold !== undefined) {
        await promptsService.updatePrompt(
          "quality_min_value_threshold",
          String(input.quality_min_value_threshold),
          "Minimum call value for quality evaluation (0-5)",
        );
      }
      if (input.enable_manager_recommendations !== undefined) {
        await promptsService.updatePrompt(
          "enable_manager_recommendations",
          input.enable_manager_recommendations ? "true" : "false",
          "Включить генерацию рекомендаций для менеджера (true/false)",
        );
      }
      if (input.telegram_bot_token !== undefined) {
        await promptsService.updatePrompt(
          "telegram_bot_token",
          input.telegram_bot_token ?? "",
          "Telegram Bot Token",
        );
      }
      if (input.max_bot_token !== undefined) {
        await promptsService.updatePrompt(
          "max_bot_token",
          input.max_bot_token ?? "",
          "MAX Bot Token",
        );
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
            );
            await systemRepository.addActivityLog(
              "info",
              `Prompt updated: ${key}`,
              (context.user as Record<string, unknown>).username as string,
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
          );
        const mb = input.prompts.max_bot_token as
          | { value?: string }
          | undefined;
        if (mb)
          await promptsService.updatePrompt(
            "max_bot_token",
            mb.value ?? "",
            "MAX Bot Token",
          );
      }
      return { success: true, message: "Settings updated successfully" };
    }),

  getModels: protectedProcedure.handler(async () => {
    const current = await promptsService.getPrompt(
      "deepseek_model",
      "deepseek-chat",
    );
    return { models: DEEPSEEK_MODELS, current_model: current };
  }),

  backup: adminProcedure.handler(async ({ context }) => {
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
    );
    return {
      success: true,
      message: "Резервная копия: выполните pg_dump $POSTGRES_URL > backup.sql",
      path: backupFilename,
    };
  }),
};
