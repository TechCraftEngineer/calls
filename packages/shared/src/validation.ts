import { z } from "zod";

/**
 * Утилиты для валидации ID
 */

/** Регулярка: ws_ + 32 hex (единый формат БД) */
const WORKSPACE_ID_REGEX = /^ws_[a-f0-9]{32}$/i;

/**
 * Проверяет, является ли строка валидным workspace ID (ws_ + 32 hex)
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
    "Неверный формат ID рабочего пространства. Ожидается ws_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  );

/**
 * Проверяет, является ли строка валидным UUIDv7
 */
export function isValidUuid(id: string): boolean {
  if (typeof id !== "string") return false;

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

/**
 * Проверяет, является ли строка валидным user_id (32 символа base64-like)
 */
export function isValidUserId(id: string): boolean {
  if (typeof id !== "string") return false;
  
  // 32 символа base64-like (буквы и цифры)
  const userIdPattern = /^[A-Za-z0-9]{32}$/;
  return userIdPattern.test(id);
}

/** Zod-схема для UUID. Использовать везде, где нужна валидация UUID */
export const uuidSchema = z.string().refine((id) => isValidUuid(id), {
  message: "Неверный формат ID. Ожидается UUIDv7",
});

/** Zod-схема для user_id. Использовать везде, где нужна валидация user_id */
export const userIdSchema = z.string().refine((id) => isValidUserId(id), {
  message: "Неверный формат user_id. Ожидается 32 символа",
});

const emailSchema = z.string().email();

/**
 * Проверяет, является ли строка валидным email (через Zod)
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  return emailSchema.safeParse(email.trim()).success;
}

// Company context validation
const INJECTION_PATTERNS = [
  /\bignore\s+(previous|prior|all)\s+(instructions?|prompts?)\b/i,
  /\bforget\s+(everything|all|your)\b/i,
  /\bdo\s+not\s+follow\s+(instructions?|prompts?)\b/i,
  /\bsystem\s+prompt\b/i,
  /\binstructions?\s*:\s*\w/i,
  /\byou\s+are\s+[\w\s]+\s+now\b/i,
  /\bdisregard\s+(previous|prior)\b/i,
  /\boverride\s+(instructions?|prompts?)\b/i,
  /\bnew\s+instructions?\s*:\s*\w/i,
];

function sanitizeCompanyContext(s: string): string {
  const trimmed = s.trim();
  let out = "";
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code > 31 && code !== 127) out += trimmed[i];
  }
  const lines = out.split(/\n/).filter((line) => {
    const l = line.trim();
    if (!l) return true;
    if (/^>>\s*\w/.test(l) || /^#\s*instruction\b/i.test(l)) return false;
    if (/^(ignore|forget|disregard|override|you\s+are)\b/i.test(l)) return false;
    if (/^system\s*[:]/i.test(l)) return false;
    if (/^new\s+instructions?\s*[:]/i.test(l)) return false;
    return true;
  });
  const result = lines.join("\n").trim();
  return result.length > 2000 ? result.slice(0, 2000) : result;
}

function hasInjectionPatterns(s: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(s));
}

/** Zod-схема для валидации company context */
export const companyContextSchema = z
  .string()
  .transform(sanitizeCompanyContext)
  .pipe(
    z
      .string()
      .max(2000)
      .refine((s) => !hasInjectionPatterns(s), {
        message: "Контекст содержит недопустимое содержимое",
      }),
  );
