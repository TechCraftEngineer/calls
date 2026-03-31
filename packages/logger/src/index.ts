/**
 * Минимальный логгер для использования в разных пакетах.
 */

type LogData = Record<string, unknown>;

export function createLogger(module: string) {
  const prefix = `[${module}]`;
  return {
    info: (message: string, data?: LogData) =>
      console.log(prefix, message, data !== undefined ? data : ""),
    warn: (message: string, data?: LogData) =>
      console.warn(prefix, message, data !== undefined ? data : ""),
    error: (message: string, data?: LogData) =>
      console.error(prefix, message, data !== undefined ? data : ""),
  };
}
