/**
 * Сериализация метаданных
 */

import { createLogger } from "../../../logger";

const logger = createLogger("metadata");

export function serializeMetadata(
  resultMetadata: unknown,
  identifyResultMetadata: unknown,
  operatorName?: string | null,
): Record<string, unknown> {
  let serializedMetadata: Record<string, unknown> = {};

  try {
    // Безопасная сериализация с фильтрацией опасных полей
    if (resultMetadata && typeof resultMetadata === "object") {
      serializedMetadata = safeDeepClone(resultMetadata) as Record<string, unknown>;
    }
    if (operatorName != null && operatorName !== "") {
      serializedMetadata.operatorName = operatorName;
    }
    if (identifyResultMetadata && typeof identifyResultMetadata === "object") {
      serializedMetadata.diarization = safeDeepClone(identifyResultMetadata);
    }
  } catch (error) {
    logger.warn("Ошибка сериализации метаданных", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return serializedMetadata;
}

/**
 * Безопасное глубокое клонирование объекта с защитой от prototype pollution
 */
function safeDeepClone(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => safeDeepClone(item));
  }

  if (typeof obj === "object") {
    const cloned: Record<string, unknown> = {};
    for (const key in obj) {
      // Защита от prototype pollution
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        continue;
      }
      if (Object.hasOwn(obj, key)) {
        cloned[key] = safeDeepClone((obj as Record<string, unknown>)[key]);
      }
    }
    return cloned;
  }

  return obj;
}
