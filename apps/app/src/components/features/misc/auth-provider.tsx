/**
 * AuthProvider - провайдер для Better Auth
 * Обеспечивает контекст аутентификации для всего приложения
 */

"use client";

import type { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Better Auth не требует специального провайдера
  // Клиент уже настроен в lib/better-auth.ts
  return <>{children}</>;
}
