/**
 * Минимальный логгер для packages/db (без зависимости от @calls/api).
 */

// Чувствительные поля которые должны быть заменены при логировании
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
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

// Precompute lowercase sensitive keys set for exact matching
const LOWER_SENSITIVE_SET = new Set(Array.from(SENSITIVE_KEYS).map((sk) => sk.toLowerCase()));

// Placeholder для замены чувствительных значений
const REDACTED = "[REDACTED]";
const CIRCULAR_PLACEHOLDER = "[Circular]";

/**
 * Санитизирует данные для логирования, удаляя чувствительную информацию.
 * Защищает от циклических ссылок через WeakSet.
 */
function sanitizeForLoggingInternal(data: unknown, visited: WeakSet<object>): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  // Примитивные типы - возвращаем как есть
  if (typeof data !== "object") {
    return data;
  }

  // Защита от циклических ссылок
  if (visited.has(data)) {
    return CIRCULAR_PLACEHOLDER;
  }

  // Обработка специальных типов
  if (data instanceof Date) {
    return data.toISOString();
  }

  if (data instanceof Error) {
    visited.add(data);
    const result = {
      name: data.name,
      message: data.message,
      stack: data.stack,
      cause: data.cause ? sanitizeForLoggingInternal(data.cause, visited) : undefined,
    };
    visited.delete(data);
    return result;
  }

  if (data instanceof Map) {
    visited.add(data);
    // Сохраняем Map как массив пар для предотвращения коллизий ключей при String(key)
    // Каждая пара: { key: string, value: unknown, keyType: string }
    const sanitizedEntries: Array<{ key: string; value: unknown; keyType: string }> = [];
    for (const [key, value] of data.entries()) {
      const keyStr = String(key);
      const keyLower = keyStr.toLowerCase();
      const sanitizedValue = LOWER_SENSITIVE_SET.has(keyLower)
        ? REDACTED
        : sanitizeForLoggingInternal(value, visited);
      sanitizedEntries.push({
        key: keyStr,
        value: sanitizedValue,
        keyType: typeof key,
      });
    }
    visited.delete(data);
    return sanitizedEntries;
  }

  if (data instanceof Set) {
    visited.add(data);
    const result = Array.from(data).map((item) => sanitizeForLoggingInternal(item, visited));
    visited.delete(data);
    return result;
  }

  if (Buffer.isBuffer(data)) {
    return `[Buffer ${data.length} bytes]`;
  }

  // Обработка массивов
  if (Array.isArray(data)) {
    visited.add(data);
    const result = data.map((item) => sanitizeForLoggingInternal(item, visited));
    visited.delete(data);
    return result;
  }

  // Обработка обычных объектов
  visited.add(data);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Проверяем ключ на чувствительность (case-insensitive exact match)
    const lowerKey = key.toLowerCase();
    const isSensitive = LOWER_SENSITIVE_SET.has(lowerKey);

    if (isSensitive) {
      sanitized[key] = REDACTED;
    } else {
      // Унифицированная обработка - всегда делегируем sanitizeForLoggingInternal
      // Он корректно обработает примитивы, объекты, массивы и специальные типы
      sanitized[key] = sanitizeForLoggingInternal(value, visited);
    }
  }
  visited.delete(data);

  return sanitized;
}

/**
 * Санитизирует данные для логирования, удаляя чувствительную информацию.
 * Публичный API - инициализирует WeakSet для отслеживания циклов.
 */
function sanitizeForLogging(data: unknown): unknown {
  return sanitizeForLoggingInternal(data, new WeakSet());
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
