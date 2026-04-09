/**
 * Сериализация метаданных
 */

import { createLogger } from "~/logger";

const logger = createLogger("metadata");

export function serializeMetadata(
  resultMetadata: unknown,
  identifyResultMetadata: unknown,
  operatorName?: string | null,
): Record<string, unknown> {
  const serializedMetadata: Record<string, unknown> = {};

  try {
    // Копируем только нужные поля из resultMetadata (без asrLogs и других больших полей)
    if (resultMetadata && typeof resultMetadata === "object") {
      const allowedFields = ["asrSource", "processingTimeMs", "confidence"];
      for (const key of allowedFields) {
        if (key in resultMetadata) {
          serializedMetadata[key] = (resultMetadata as Record<string, unknown>)[key];
        }
      }
    }

    // Копируем только нужные поля из identifyResultMetadata (без speakers)
    if (identifyResultMetadata && typeof identifyResultMetadata === "object") {
      const allowedIdentifyFields = [
        "success",
        "reason",
        "usedEmbeddings",
        "clusterCount",
        "fallbackAttempted",
        "fallbackReason",
        "truncatedForAnalysis",
        "mapping", // Сохраняем маппинг спикеров (SPEAKER_00 -> Оператор/Клиент)
      ];
      for (const key of allowedIdentifyFields) {
        if (key in identifyResultMetadata) {
          serializedMetadata[key] = (identifyResultMetadata as Record<string, unknown>)[key];
        }
      }
    }

    if (operatorName != null && operatorName !== "") {
      serializedMetadata.operatorName = operatorName;
    }
  } catch (error) {
    logger.warn("Ошибка сериализации метаданных", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return serializedMetadata;
}
