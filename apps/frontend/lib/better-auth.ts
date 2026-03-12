/**
 * Better Auth client configuration
 * Современная аутентификация для frontend
 */

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
});

// Хуки для работы с аутентификацией
export const { useSession, signIn, signUp, signOut } = authClient;

// Утилиты для совместимости со старым кодом
export async function login(username: string, password: string) {
  try {
    const result = await signIn.email({
      email: username,
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
    console.error("Logout error:", error);
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

export function isAuthenticated(): boolean {
  // Better Auth работает с cookies, поэтому проверяем через хук или сессию
  if (typeof window !== "undefined") {
    return document.cookie.includes("better-auth.session_token");
  }
  return false;
}
