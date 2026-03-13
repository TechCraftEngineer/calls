/**
 * Better Auth client configuration
 * Современная аутентификация для frontend
 */

import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { extractUserFields, isAdminUser } from "./user-profile";

function getAuthBaseUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) return envUrl.replace(/\/?$/, "");
    if (window.location.origin.includes("zvonki.qbs.ru"))
      return "https://zvonki.qbsoft.ru";
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/?$/, "") ||
    "http://localhost:7000"
  );
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  basePath: "/api/auth",
  plugins: [usernameClient()],
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
