import { systemRepository, workspaceSettingsRepository } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";
import { DEEPSEEK_MODELS, REPORT_SETTINGS_KEYS } from "../constants";
import { settingsUpdateSchema } from "../schemas";
import { maskSensitiveData } from "../utils";

export const updatePrompts = workspaceAdminProcedure
  .input(settingsUpdateSchema)
  .handler(async ({ input, context }) => {
    const { workspaceId } = context;
    const username =
      (context.user as Record<string, unknown>)?.email ?? "system";

    const upserts: Promise<boolean>[] = [];

    if (input.deepseek_model && input.deepseek_model in DEEPSEEK_MODELS) {
      upserts.push(
        workspaceSettingsRepository.upsert(
          "deepseek_model",
          input.deepseek_model,
          "Selected DeepSeek model",
          workspaceId,
        ),
      );
    }
    if (input.quality_min_value_threshold !== undefined) {
      upserts.push(
        workspaceSettingsRepository.upsert(
          "quality_min_value_threshold",
          String(input.quality_min_value_threshold),
          "Minimum call value for quality evaluation (0-5)",
          workspaceId,
        ),
      );
    }
    if (input.enable_manager_recommendations !== undefined) {
      upserts.push(
        workspaceSettingsRepository.upsert(
          "enable_manager_recommendations",
          input.enable_manager_recommendations ? "true" : "false",
          "Включить генерацию рекомендаций для менеджера (true/false)",
          workspaceId,
        ),
      );
    }
    if (input.evaluation_default_template !== undefined) {
      upserts.push(
        workspaceSettingsRepository.upsert(
          "evaluation_default_template",
          input.evaluation_default_template,
          "Шаблон оценки звонков по умолчанию (sales/support/general)",
          workspaceId,
        ),
      );
    }
    const promptLogItems: { key: string; value: string }[] = [];
    if (input.prompts) {
      for (const key of REPORT_SETTINGS_KEYS) {
        const p = input.prompts[key] as
          | { value?: string; description?: string }
          | undefined;
        if (p) {
          promptLogItems.push({ key, value: p.value ?? "" });
          upserts.push(
            workspaceSettingsRepository.upsert(
              key,
              p.value ?? "",
              p.description ?? "",
              workspaceId,
            ),
          );
        }
      }
    }

    const results = await Promise.all(upserts);
    if (results.some((ok) => !ok)) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось обновить некоторые настройки",
      });
    }
    for (const { key, value } of promptLogItems) {
      const maskedValue = maskSensitiveData(key, value);
      try {
        await systemRepository.addActivityLog(
          "info",
          `Настройка обновлена: ${key} = ${maskedValue}`,
          String(username),
          workspaceId,
        );
      } catch {
        // Логирование best-effort: не прерываем обработчик при ошибке
      }
    }
    return { success: true };
  });
