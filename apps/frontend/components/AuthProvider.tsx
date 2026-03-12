/**
 * AuthProvider - провайдер для Better Auth
 * Обеспечивает контекст аутентификации для всего приложения
 */

"use client";

import type { ReactNode } from "react";
import { authClient } from "@/lib/better-auth";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Better Auth не требует специального провайдера
  // Клиент уже настроен в lib/better-auth.ts
  return <>{children}</>;
}
