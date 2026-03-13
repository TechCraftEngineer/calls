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

    // Convert Better Auth user to expected User interface (username plugin adds username/displayUsername)
    const u = user as {
      username?: string;
      displayUsername?: string;
      internal_numbers?: string | null;
    };
    const username =
      u.username ?? u.displayUsername ?? user.email ?? user.name ?? "—";
    const internalNumbers = u.internal_numbers ?? null;

    // Совпадаем с логикой API (orpc.ts isAdmin): admin по username или internal_numbers
    const isAdmin =
      username === "admin@mango" ||
      username === "admin@gmail.com" ||
      String(internalNumbers ?? "")
        .trim()
        .toLowerCase() === "all";

    return {
      id: Number(user.id), // Convert string id to number
      username,
      name: user.name || "—",
      first_name: user.name?.split(" ")[0] || "",
      last_name: user.name?.split(" ")[1] || "",
      role: isAdmin ? "admin" : "user",
      internal_numbers: internalNumbers,
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

/** Нативная проверка: React — useAuth().isAuthenticated, иначе — getSession() или getCurrentUser(). */
export async function isAuthenticated(): Promise<boolean> {
  const session = await authClient.getSession();
  return !!session.data?.user;
}
