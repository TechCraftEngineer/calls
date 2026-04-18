/**
 * Строгие TypeScript интерфейсы для пользовательских данных
 * Унифицированные типы для использования во всем приложении
 */

import type { User } from "@/lib/auth";

// Базовые поля пользователя (OIDC + domain стандарты)
export interface BaseUserFields {
  id: string | number;
  username: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Дополнительные поля пользователя (additional fields)
export interface UserAdditionalFields {
  givenName?: string;
  familyName?: string;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
  telegramChatId?: string | null;
}

// Пользователь из API ответа
export interface ApiUser extends Omit<User, "id"> {
  id: number;
  created_at?: string | null;
}

// Пользователь из Better Auth
export interface BetterAuthUser extends BaseUserFields, UserAdditionalFields {
  // Better Auth специфичные поля
  bio?: string;
  language?: string;
}

// Данные для создания пользователя
export interface CreateUserData {
  username: string;
  password: string;
  givenName: string;
  familyName?: string;
  internalExtensions?: string;
  mobilePhones?: string;
}

// Данные для обновления пользователя
export interface UpdateUserData {
  givenName?: string;
  familyName?: string;
  internalExtensions?: string;
  mobilePhones?: string;
  email?: string;
  is_active?: boolean;
}

// Утилитарный тип
export type UserLike = Record<string, unknown>;
