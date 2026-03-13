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

// Переэкспортируем все типы и функции из types/user.ts для удобства
export * from "./types/user";
