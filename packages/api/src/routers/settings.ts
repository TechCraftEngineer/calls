import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { storage } from "@calls/backend-storage";
import { fileURLToPath } from "url";
import { z } from "zod";
import { adminProcedure, protectedProcedure } from "../orpc";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    return storage.getAllPrompts();
  }),

  updatePrompts: adminProcedure
    .input(settingsUpdateSchema)
    .handler(async ({ input, context }) => {
      if (input.deepseek_model && input.deepseek_model in DEEPSEEK_MODELS) {
        storage.updatePrompt(
          "deepseek_model",
          input.deepseek_model,
          "Selected DeepSeek model",
        );
      }
      if (input.quality_min_value_threshold !== undefined) {
        storage.updatePrompt(
          "quality_min_value_threshold",
          String(input.quality_min_value_threshold),
          "Minimum call value for quality evaluation (0-5)",
        );
      }
      if (input.enable_manager_recommendations !== undefined) {
        storage.updatePrompt(
          "enable_manager_recommendations",
          input.enable_manager_recommendations ? "true" : "false",
          "Включить генерацию рекомендаций для менеджера (true/false)",
        );
      }
      if (input.telegram_bot_token !== undefined) {
        storage.updatePrompt(
          "telegram_bot_token",
          input.telegram_bot_token ?? "",
          "Telegram Bot Token",
        );
      }
      if (input.max_bot_token !== undefined) {
        storage.updatePrompt(
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
            storage.updatePrompt(key, p.value ?? "", p.description ?? "");
            storage.addActivityLog(
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
          storage.updatePrompt(
            "telegram_bot_token",
            tb.value ?? "",
            "Telegram Bot Token",
          );
        const mb = input.prompts.max_bot_token as
          | { value?: string }
          | undefined;
        if (mb)
          storage.updatePrompt(
            "max_bot_token",
            mb.value ?? "",
            "MAX Bot Token",
          );
      }
      return { success: true, message: "Settings updated successfully" };
    }),

  getModels: protectedProcedure.handler(async () => {
    const current = storage.getPrompt("deepseek_model", "deepseek-chat");
    return { models: DEEPSEEK_MODELS, current_model: current };
  }),

  backup: adminProcedure.handler(async ({ context }) => {
    const dbPath =
      process.env.BACKEND_DB_PATH ??
      resolve(__dirname, "../../../apps/backend/data/db.sqlite");
    if (!existsSync(dbPath)) throw new Error("База данных не найдена");
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(0, 15);
    const backupFilename = `db_${timestamp}.sqlite`;
    const backupsDir = resolve(dirname(dbPath), "backups");
    if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });
    const backupPath = resolve(backupsDir, backupFilename);
    copyFileSync(dbPath, backupPath);
    storage.addActivityLog(
      "info",
      `Резервная копия базы: ${backupFilename} → ${backupPath}`,
      (context.user as Record<string, unknown>).username as string,
    );
    return {
      success: true,
      message: "Резервная копия создана.",
      path: backupPath,
    };
  }),
};
