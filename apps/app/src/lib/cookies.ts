"use client";

/**
 * Утилиты для работы с cookies
 * Централизованное управление cookie для обеспечения консистентности атрибутов
 */

const COOKIE_NAME = "active_workspace_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Устанавливает cookie активного workspace
 */
export function setActiveWorkspaceCookie(workspaceId: string): void {
  if (typeof document === "undefined") return;
  const isSecure = window.location.protocol === "https:";
  const cookieString = `${COOKIE_NAME}=${workspaceId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
  document.cookie = cookieString;
}

/**
 * Очищает cookie активного workspace
 */
export function clearActiveWorkspaceCookie(): void {
  if (typeof document === "undefined") return;
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Получает значение cookie активного workspace
 */
export function getActiveWorkspaceCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1]?.trim() ?? null;
}
