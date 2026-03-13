/**
 * Backend user profile utilities with strict TypeScript types
 * Унифицированная обработка полей пользователя для backend
 */

// Базовые типы для backend
export interface UserLike {
  id?: string | number;
  username?: string;
  displayUsername?: string;
  name?: string;
  email?: string | null | undefined;
  givenName?: string | null | undefined;
  familyName?: string | null | undefined;
  internalExtensions?: string | null | undefined;
  mobilePhones?: string | null | undefined;
  telegramChatId?: string | null | undefined;
  created_at?: string | null | undefined;
  is_active?: boolean | null | undefined;
}

export interface ApiUser {
  id: number;
  username: string;
  name: string;
  givenName: string;
  familyName: string;
  role: 'admin' | 'user';
  internalExtensions: string | null;
  mobilePhones: string | null;
  telegramChatId: string | null;
  email: string;
  created_at: string | null;
  is_active: boolean;
}

/**
 * Canonical user profile shape. TypeScript: camelCase; DB: snake_case.
 */
export type UserProfileFields = {
  givenName: string;
  familyName: string;
  internalExtensions: string | null;
  mobilePhones: string | null;
  telegramChatId: string | null;
};

export function getInternalExtensions(u: UserLike): string | null {
  return (u.internalExtensions ?? null) as string | null;
}

export function getGivenName(u: UserLike): string {
  return ((u.givenName as string) ?? "") || "";
}

export function getFamilyName(u: UserLike): string {
  return ((u.familyName as string) ?? "") || "";
}

export function getMobilePhones(u: UserLike): string | null {
  return (u.mobilePhones ?? null) as string | null;
}

export function getTelegramChatId(u: UserLike): string | null {
  return (u.telegramChatId ?? null) as string | null;
}

export function getDisplayName(u: UserLike): string {
  const given = getGivenName(u);
  const family = getFamilyName(u);
  return [given, family].filter(Boolean).join(" ") || (u.name as string) || "—";
}

/**
 * Унифицированная функция для извлечения полей пользователя в backend
 * Использует fallback к name.split() для обратной совместимости
 */
export function extractUserFields(user: UserLike) {
  const username = (user.username ??
    user.displayUsername ??
    user.email ??
    user.name ??
    "—") as string;

  const givenName = (user.givenName ?? user.name?.toString().split(" ")[0] ?? "") as string;
  const familyName = (user.familyName ?? user.name?.toString().split(" ")[1] ?? "") as string;
  const internalExtensions = (user.internalExtensions ?? null) as string | null;
  const mobilePhones = (user.mobilePhones ?? null) as string | null;
  const telegramChatId = (user.telegramChatId ?? null) as string | null;

  return {
    username,
    givenName,
    familyName,
    internalExtensions,
    mobilePhones,
    telegramChatId,
    displayName: getDisplayName({ ...user, givenName, familyName }),
  };
}

export function isAdminUser(u: UserLike): boolean {
  const { username, internalExtensions } = extractUserFields(u);
  return (
    username === "admin@mango" ||
    username === "admin@gmail.com" ||
    String(internalExtensions ?? "")
      .trim()
      .toLowerCase() === "all"
  );
}

/**
 * Преобразование пользователя для API ответа
 */
export function formatUserForApi(user: UserLike): ApiUser {
  const fields = extractUserFields(user);
  const isAdmin = isAdminUser(user);

  return {
    id: Number(user.id),
    username: fields.username,
    name: user.name || "—",
    givenName: fields.givenName,
    familyName: fields.familyName,
    role: isAdmin ? "admin" : "user",
    internalExtensions: fields.internalExtensions,
    mobilePhones: fields.mobilePhones,
    telegramChatId: fields.telegramChatId,
    email: user.email as string,
    created_at: user.created_at as string | null,
    is_active: (user as { is_active?: boolean }).is_active ?? true,
  };
}
