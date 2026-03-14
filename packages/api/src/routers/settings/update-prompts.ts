import { promptsService, settingsService, systemRepository } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../orpc";
import { DEEPSEEK_MODELS, PROMPT_KEYS } from "./constants";
import { ftpCredentialsSchema, settingsUpdateSchema } from "./schemas";
import { maskSensitiveData } from "./utils";

export const updatePrompts = workspaceAdminProcedure
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
      input.megafon_ftp_enabled !== undefined ||
      input.megafon_ftp_host !== undefined ||
      input.megafon_ftp_user !== undefined ||
      input.megafon_ftp_password !== undefined
    ) {
      const current = await settingsService.getMegafonFtpSettings(workspaceId);
      const enabled = input.megafon_ftp_enabled ?? current.enabled;
      const host = input.megafon_ftp_host ?? current.host ?? "";
      const user = input.megafon_ftp_user ?? current.user ?? "";
      const password = input.megafon_ftp_password ?? current.password ?? "";

      if (host && user && password) {
        try {
          ftpCredentialsSchema.parse({ host, user, password });
        } catch (error) {
          throw new ORPCError("BAD_REQUEST", {
            message: `Ошибка валидации FTP: ${(error as Error).message}`,
          });
        }
      }

      const username =
        (context.user as Record<string, unknown>)?.username ?? "system";
      await settingsService.updateMegafonFtpSettings(
        enabled,
        host,
        user,
        password,
        workspaceId,
        String(username),
      );
    }
    if (input.prompts) {
      for (const key of PROMPT_KEYS) {
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
          const maskedValue = maskSensitiveData(key, p.value ?? "");
          const username =
            (context.user as Record<string, unknown>)?.username ?? "system";
          await systemRepository.addActivityLog(
            "info",
            `Prompt updated: ${key} = ${maskedValue}`,
            String(username),
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
      const mb = input.prompts.max_bot_token as { value?: string } | undefined;
      if (mb)
        await promptsService.updatePrompt(
          "max_bot_token",
          mb.value ?? "",
          "MAX Bot Token",
          workspaceId,
        );
    }
    return { success: true, message: "Settings updated successfully" };
  });
