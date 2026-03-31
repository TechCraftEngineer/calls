/**
 * Better Auth client configuration
 * Современная аутентификация для frontend
 */

import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { extractUserFields, isAdminUser } from "./user-profile";

// baseURL — URL приложения (запросы идут через Next.js proxy /api/auth → backend)
function getAuthBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/?$/, "") || window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/?$/, "") || "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  basePath: "/api/auth",
  plugins: [adminClient()],
});

// Типизированные хуки для работы с аутентификацией
export const { useSession, signIn, signUp, signOut } = authClient;

/** Маппинг английских сообщений об ошибках аутентификации на русские */
const AUTH_ERROR_MESSAGES_RU: Record<string, string> = {
  "Invalid email or password": "Неверный email или пароль",
  "Invalid credentials": "Неверный email или пароль",
  "Invalid email address": "Неверный email или пароль",
  "Email is required": "Введите email",
  "Password is required": "Введите пароль",
  "User already exists. Use another email.":
    "Пользователь с таким email уже существует. Укажите другой email.",
  "Invalid password": "Неверный текущий пароль",
  "Password is incorrect": "Неверный текущий пароль",
};

/** Переводит сообщения об ошибках аутентификации на русский */
export function toRussianAuthMessage(msg: string): string {
  return AUTH_ERROR_MESSAGES_RU[msg] ?? msg;
}

// Утилиты для совместимости со старым кодом (вход по email)
export async function login(email: string, password: string) {
  try {
    const result = await signIn.email({
      email,
      password,
    });

    if (result.error) {
      const rawMessage = result.error.message || "Ошибка входа";
      return {
        success: false,
        message: toRussianAuthMessage(rawMessage),
        user: undefined,
      };
    }

    return {
      success: true,
      message: "Вход выполнен",
      user: result.data?.user,
    };
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : "Ошибка входа";
    return {
      success: false,
      message: toRussianAuthMessage(rawMessage),
      user: undefined,
    };
  }
}

export async function logout() {
  try {
    await signOut();
  } catch (_error) {
    // Убрали console.error для продакшена
  }
}

export async function getCurrentUser() {
  try {
    const session = await authClient.getSession();
    const user = session.data?.user;

    if (!user) return null;

    const fields = extractUserFields(user as Record<string, unknown>);
    const isAdmin = isAdminUser(user as Record<string, unknown>);

    return {
      id: user.id,
      email: user.email,
      name: user.name || "—",
      givenName: fields.givenName,
      familyName: fields.familyName,
      role: isAdmin ? "admin" : "user",
      internalExtensions: fields.internalExtensions,
      mobilePhones: fields.mobilePhones,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    // Логируем ошибку для отладки, но не прерываем работу приложения
    console.error(
      "[getCurrentUser] Error fetching user:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/** Нативная проверка: React — useAuth().isAuthenticated, иначе — getSession() или getCurrentUser(). */
export async function isAuthenticated(): Promise<boolean> {
  const session = await authClient.getSession();
  return !!session.data?.user;
}
