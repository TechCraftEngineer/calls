/**
 * Минимальный логгер для packages/db (без зависимости от @calls/api).
 */

export function createLogger(module: string) {
  const prefix = `[${module}]`;
  return {
    info: (message: string, data?: unknown) =>
      console.log(prefix, message, data !== undefined ? data : ""),
    warn: (message: string, data?: unknown) =>
      console.warn(prefix, message, data !== undefined ? data : ""),
    error: (message: string, data?: unknown) =>
      console.error(prefix, message, data !== undefined ? data : ""),
  };
}
