/**
 * Better Auth client configuration
 * Современная аутентификация для frontend
 */

import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { extractUserFields, isAdminUser } from "./user-profile";

// baseURL — URL приложения (запросы идут через Next.js proxy /api/auth → backend)
function getAuthBaseUrl(): string {
  if (typeof window !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/?$/, "") ||
      window.location.origin
    );
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/?$/, "") ||
    "http://localhost:3000"
  );
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  basePath: "/api/auth",
  plugins: [usernameClient(), adminClient()],
});

// Хуки для работы с аутентификацией
export const { useSession, signIn, signUp, signOut } = authClient;

// Утилиты для совместимости со старым кодом (вход по email)
export async function login(email: string, password: string) {
  try {
    const result = await signIn.email({
      email,
      password,
    });

    if (result.error) {
      return {
        success: false,
        message: result.error.message || "Ошибка входа",
        user: undefined,
      };
    }

    return {
      success: true,
      message: "Вход выполнен",
      user: result.data?.user,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Ошибка входа",
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
      id: Number(user.id),
      username: fields.username,
      name: user.name || "—",
      givenName: fields.givenName,
      familyName: fields.familyName,
      role: isAdmin ? "admin" : "user",
      internalExtensions: fields.internalExtensions,
      mobilePhones: fields.mobilePhones,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch {
    return null;
  }
}

/** Нативная проверка: React — useAuth().isAuthenticated, иначе — getSession() или getCurrentUser(). */
export async function isAuthenticated(): Promise<boolean> {
  const session = await authClient.getSession();
  return !!session.data?.user;
}
