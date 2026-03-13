/**
 * Утилиты для генерации workspace ID
 */

import { sql } from "drizzle-orm";

/**
 * SQL функция для генерации workspace ID с префиксом ws_
 */
export const workspaceIdGenerate = sql`workspace_id_generate()`;

/**
 * SQL функция для генерации UUIDv7 (сортируемый по времени)
 */
export const uuidv7 = sql`uuidv7()`;

/**
 * Валидация формата workspace ID
 * @param id - ID для проверки
 * @returns true если ID соответствует формату ws_*
 */
export function isValidWorkspaceId(id: string): boolean {
  return /^ws_[a-f0-9]{32}$/i.test(id);
}

/**
 * Извлечение UUID из workspace ID
 * @param workspaceId - workspace ID в формате ws_*
 * @returns UUID часть или null если формат неверный
 */
export function extractUuidFromWorkspaceId(workspaceId: string): string | null {
  if (!isValidWorkspaceId(workspaceId)) {
    return null;
  }

  return workspaceId.substring(3); // Удаляем префикс "ws_"
}

/**
 * Форматирование UUID в workspace ID
 * @param uuid - UUID для форматирования
 * @returns workspace ID в формате ws_*
 */
export function formatWorkspaceId(uuid: string): string {
  // Удаляем дефисы из UUID
  const cleanUuid = uuid.replace(/-/g, "");

  if (cleanUuid.length !== 32) {
    throw new Error("Invalid UUID length for workspace ID");
  }

  return `ws_${cleanUuid}`;
}

/**
 * Генерация workspace ID на клиенте (для тестов)
 * @returns workspace ID в формате ws_*
 */
export function generateWorkspaceId(): string {
  // Генерируем случайный UUID v4
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  return formatWorkspaceId(uuid);
}

/**
 * Проверка является ли ID workspace ID
 * @param id - ID для проверки
 * @returns true если это workspace ID
 */
export function isWorkspaceId(id: string): boolean {
  return typeof id === "string" && id.startsWith("ws_") && id.length === 35;
}
