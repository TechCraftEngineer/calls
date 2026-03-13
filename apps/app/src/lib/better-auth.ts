/**
 * Better Auth client configuration
 * Современная аутентификация для frontend
 */

import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

function getAuthBaseUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) return envUrl.replace(/\/?$/, "");
    if (window.location.origin.includes("zvonki.qbs.ru"))
      return "https://zvonki.qbs.ru";
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/?$/, "") ||
    "http://localhost:8000"
  );
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  basePath: "/api/auth",
  plugins: [usernameClient()],
});

// Хуки для работы с аутентификацией
export const { useSession, signIn, signUp, signOut } = authClient;

// Утилиты для совместимости со старым кодом
export async function login(username: string, password: string) {
  try {
    const result = await signIn.username({
      username,
      password,
    });

    if (result.error) {
      return {
        success: false,
        message: result.error.message || "Login failed",
        user: undefined,
      };
    }

    return {
      success: true,
      message: "Login successful",
      user: result.data?.user,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Login failed",
      user: undefined,
    };
  }
}

export async function logout() {
  try {
    await signOut();
  } catch (error) {
    // Убрали console.error для продакшена
  }
}

export async function getCurrentUser() {
  try {
    const session = await authClient.getSession();
    const user = session.data?.user;

    if (!user) return null;

    // Convert Better Auth user to expected User interface
    return {
      id: Number(user.id), // Convert string id to number
      username: user.email || user.name || "unknown",
      name: user.name || "Unknown",
      first_name: user.name?.split(" ")[0] || "",
      last_name: user.name?.split(" ")[1] || "",
      role: "user",
      internal_numbers: null,
      mobile_numbers: null,
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

/**
 * Быстрая проверка наличия cookie сессии (синхронная).
 * Для React-компонентов рекомендуется useAuth().isAuthenticated (опирается на сессию).
 * Для проверки вне React — getSession() или getCurrentUser().
 */
export function isAuthenticated(): boolean {
  if (typeof window !== "undefined") {
    return document.cookie.includes("better-auth.session_token");
  }
  return false;
}
