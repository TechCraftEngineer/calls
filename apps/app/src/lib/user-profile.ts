/**
 * Standard user profile fields (OIDC + domain naming).
 */
import type { UserLike } from "@/types/user";

export function getGivenName(u: UserLike): string {
  return ((u.givenName as string) ?? "") || "";
}

export function getFamilyName(u: UserLike): string {
  return ((u.familyName as string) ?? "") || "";
}

export function getInternalExtensions(u: UserLike): string | null {
  return (u.internalExtensions as string) ?? null;
}

export function getMobilePhones(u: UserLike): string | null {
  return (u.mobilePhones as string) ?? null;
}

export function getTelegramChatId(u: UserLike): string | null {
  return (u.telegramChatId as string) ?? null;
}

export function getDisplayName(u: UserLike): string {
  const given = getGivenName(u);
  const family = getFamilyName(u);
  return [given, family].filter(Boolean).join(" ") || (u.name as string) || "—";
}

/**
 * Унифицированная функция для извлечения полей пользователя
 * Использует fallback к name.split() для обратной совместимости
 */
export function extractUserFields(user: UserLike) {
  const username = (user.username ??
    user.displayUsername ??
    user.email ??
    user.name ??
    "—") as string;

  const givenName = (user.givenName ??
    user.name?.toString().split(" ")[0] ??
    "") as string;
  const familyName = (user.familyName ??
    user.name?.toString().split(" ")[1] ??
    "") as string;
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

/**
 * Проверка прав администратора на основе username и internalExtensions
 */
export function isAdminUser(user: UserLike): boolean {
  const { username, internalExtensions } = extractUserFields(user);
  return (
    username === "admin@mango" ||
    username === "admin@gmail.com" ||
    String(internalExtensions ?? "")
      .trim()
      .toLowerCase() === "all"
  );
}
