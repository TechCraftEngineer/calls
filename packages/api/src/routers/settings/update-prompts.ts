import { promptsRepository, systemRepository } from "@calls/db";
import { workspaceAdminProcedure } from "../../orpc";
import { DEEPSEEK_MODELS, PROMPT_KEYS } from "./constants";
import { settingsUpdateSchema } from "./schemas";
import { maskSensitiveData } from "./utils";

export const updatePrompts = workspaceAdminProcedure
  .input(settingsUpdateSchema)
  .handler(async ({ input, context }) => {
    const { workspaceId } = context;
    const username =
      (context.user as Record<string, unknown>)?.email ?? "system";

    if (input.deepseek_model && input.deepseek_model in DEEPSEEK_MODELS) {
      await promptsRepository.upsert(
        "deepseek_model",
        input.deepseek_model,
        "Selected DeepSeek model",
        workspaceId,
      );
    }
    if (input.quality_min_value_threshold !== undefined) {
      await promptsRepository.upsert(
        "quality_min_value_threshold",
        String(input.quality_min_value_threshold),
        "Minimum call value for quality evaluation (0-5)",
        workspaceId,
      );
    }
    if (input.enable_manager_recommendations !== undefined) {
      await promptsRepository.upsert(
        "enable_manager_recommendations",
        input.enable_manager_recommendations ? "true" : "false",
        "Включить генерацию рекомендаций для менеджера (true/false)",
        workspaceId,
      );
    }
    if (input.evaluation_default_template !== undefined) {
      await promptsRepository.upsert(
        "evaluation_default_template",
        input.evaluation_default_template,
        "Шаблон оценки звонков по умолчанию (sales/support/general)",
        workspaceId,
      );
    }
    if (input.prompts) {
      for (const key of PROMPT_KEYS) {
        const p = input.prompts[key] as
          | { value?: string; description?: string }
          | undefined;
        if (p) {
          await promptsRepository.upsert(
            key,
            p.value ?? "",
            p.description ?? "",
            workspaceId,
          );
          const maskedValue = maskSensitiveData(key, p.value ?? "");
          await systemRepository.addActivityLog(
            "info",
            `Setting updated: ${key} = ${maskedValue}`,
            String(username),
            workspaceId,
          );
        }
      }
    }
    return { success: true, message: "Settings updated successfully" };
  });
