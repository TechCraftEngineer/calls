/**
 * Утилиты для безопасного логирования
 * Фильтрует чувствительные данные перед выводом в логи
 */

// Список чувствительных полей для фильтрации
const SENSITIVE_FIELDS = [
  "password",
  "newPassword",
  "confirmPassword",
  "new_password",
  "confirm_password",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "key",
  "authorization",
  "cookie",
  "session",
  "telegramChatId",
  "telegram_chat_id",
  "max_chat_id",
];

// Список чувствительных полей для частичной маскировки
const PARTIAL_MASK_FIELDS = ["email", "username"];

/**
 * Маскирует чувствительные данные в объекте
 */
export function sanitizeForLogging(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return maskString(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item));
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      const lowerKey = key.toLowerCase();

      if (
        SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))
      ) {
        sanitized[key] = "[REDACTED]";
      } else if (
        PARTIAL_MASK_FIELDS.some((field) =>
          lowerKey.includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = maskString(String(value));
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Маскирует строку скрывая середину
 */
function maskString(str: string): string {
  if (!str || typeof str !== "string") {
    return str;
  }

  if (str.length <= 3) {
    return "[REDACTED]";
  }

  const start = str.substring(0, 2);
  const end = str.substring(str.length - 2);
  const middle = "*".repeat(Math.max(3, str.length - 4));

  return `${start}${middle}${end}`;
}

/**
 * Безопасное логирование с фильтрацией чувствительных данных
 */
export function safeLog(
  level: "info" | "warn" | "error",
  message: string,
  data?: unknown,
) {
  const sanitizedData = data ? sanitizeForLogging(data) : undefined;

  switch (level) {
    case "info":
      console.log(`[${level.toUpperCase()}] ${message}`, sanitizedData);
      break;
    case "warn":
      console.warn(`[${level.toUpperCase()}] ${message}`, sanitizedData);
      break;
    case "error":
      console.error(`[${level.toUpperCase()}] ${message}`, sanitizedData);
      break;
  }
}

/**
 * Создает безопасный логгер для конкретного модуля
 */
export function createLogger(module: string) {
  return {
    info: (message: string, data?: unknown) =>
      safeLog("info", `[${module}] ${message}`, data),
    warn: (message: string, data?: unknown) =>
      safeLog("warn", `[${module}] ${message}`, data),
    error: (message: string, data?: unknown) =>
      safeLog("error", `[${module}] ${message}`, data),
  };
}
