/**
 * Утилиты для унификации работы с ID в системе
 */

/**
 * Конвертирует любой тип ID в строку для консистентности
 */
export function normalizeId(id: string | number | undefined | null): string {
  if (id === undefined || id === null) {
    return '';
  }
  return String(id);
}

/**
 * Безопасно сравнивает два ID разных типов
 */
export function compareIds(id1: string | number | undefined | null, id2: string | number | undefined | null): boolean {
  return normalizeId(id1) === normalizeId(id2);
}

/**
 * Проверяет, что ID валидный (не пустой)
 */
export function isValidId(id: string | number | undefined | null): boolean {
  const normalized = normalizeId(id);
  return normalized.length > 0 && normalized !== 'null' && normalized !== 'undefined';
}

/**
 * Тип для безопасной работы с ID в компонентах
 */
export type SafeId = string;

/**
 * Конвертирует ID из API response в безопасный формат
 */
export function safeId(id: unknown): SafeId {
  if (typeof id === 'string') return id;
  if (typeof id === 'number') return id.toString();
  return '';
}
