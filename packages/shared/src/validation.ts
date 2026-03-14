/**
 * Утилиты для валидации ID
 */

/**
 * Проверяет, является ли строка валидным UUIDv7 с префиксом (например, ws_123456)
 */
export function isValidWorkspaceId(id: string): boolean {
  if (typeof id !== 'string') return false;
  
  // Проверяем формат workspace ID: ws_ + UUIDv7
  const workspaceIdPattern = /^ws_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return workspaceIdPattern.test(id);
}

/**
 * Проверяет, является ли строка валидным UUIDv7
 */
export function isValidUuid(id: string): boolean {
  if (typeof id !== 'string') return false;
  
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

/**
 * Проверяет, является ли строка валидным email
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}
