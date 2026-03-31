import { z } from "zod";

/**
 * Утилиты для валидации ID
 */

/** Регулярка: ws_ + 32 hex (формат БД) или ws_ + UUIDv7 с дефисами */
const WORKSPACE_ID_REGEX =
  /^ws_([0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$/;

/**
 * Проверяет, является ли строка валидным workspace ID (ws_ + 32 hex или ws_ + UUIDv7)
 */
export function isValidWorkspaceId(id: string): boolean {
  if (typeof id !== "string") return false;
  return WORKSPACE_ID_REGEX.test(id);
}

/** Zod-схема для workspaceId. Использовать везде, где нужна валидация workspaceId */
export const workspaceIdSchema = z
  .string()
  .regex(
    WORKSPACE_ID_REGEX,
    "Неверный формат ID рабочего пространства. Ожидается ws_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx или ws_xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx",
  );

/**
 * Проверяет, является ли строка валидным UUIDv7
 */
export function isValidUuid(id: string): boolean {
  if (typeof id !== "string") return false;

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

const emailSchema = z.string().email();

/**
 * Проверяет, является ли строка валидным email (через Zod)
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  return emailSchema.safeParse(email.trim()).success;
}
