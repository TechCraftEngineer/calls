/**
 * Минимальный логгер для packages/db (без зависимости от @calls/api).
 */

// Чувствительные поля которые должны быть заменены при логировании
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "email",
  "ssn",
  "creditCard",
  "credit_card",
  "phone",
  "phoneNumber",
  "phone_number",
  "authorization",
  "cookie",
  "setCookie",
  "set_cookie",
  "crm_token",
  "webhookSecret",
  "webhook_secret",
]);

// Placeholder для замены чувствительных значений
const REDACTED = "[REDACTED]";

/**
 * Санитизирует данные для логирования, удаляя чувствительную информацию
 */
function sanitizeForLogging(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  // Примитивные типы - возвращаем как есть
  if (typeof data !== "object") {
    return data;
  }

  // Обработка массивов
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item));
  }

  // Обработка объектов
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Проверяем ключ на чувствительность (case-insensitive)
    const lowerKey = key.toLowerCase();
    const isSensitive = Array.from(SENSITIVE_KEYS).some((sk) =>
      lowerKey.includes(sk.toLowerCase()),
    );

    if (isSensitive) {
      sanitized[key] = REDACTED;
    } else if (typeof value === "object" && value !== null) {
      // Рекурсивная обработка вложенных объектов
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function createLogger(moduleName: string) {
  const prefix = `[${moduleName}]`;
  return {
    info: (message: string, data?: unknown) =>
      console.log(prefix, message, data !== undefined ? sanitizeForLogging(data) : ""),
    warn: (message: string, data?: unknown) =>
      console.warn(prefix, message, data !== undefined ? sanitizeForLogging(data) : ""),
    error: (message: string, data?: unknown) =>
      console.error(prefix, message, data !== undefined ? sanitizeForLogging(data) : ""),
  };
}
