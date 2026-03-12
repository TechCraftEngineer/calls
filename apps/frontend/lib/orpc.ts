/**
 * oRPC client for backend-api.
 * Основной API клиент приложения.
 */

import { createBackendClient } from "@acme/backend-api-client";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) return envUrl.replace(/\/(api|\/api\/)?$/, "");
    if (window.location.origin.includes("zvonki.qbs.ru")) return "https://zvonki.qbs.ru";
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/(api|\/api\/)?$/, "") || "http://localhost:8000";
}

/** Тип API клиента — соответствует backend-api роутерам */
export interface BackendApi {
  calls: {
    list: (input: Record<string, unknown>) => Promise<{ calls: unknown[]; pagination: Record<string, unknown>; metrics: Record<string, unknown>; managers: unknown[] }>;
    get: (input: { call_id: number }) => Promise<{ call: unknown; transcript?: unknown; evaluation?: unknown }>;
    generateRecommendations: (input: { call_id: number }) => Promise<unknown>;
    delete: (input: { call_id: number }) => Promise<{ success: boolean; message: string }>;
  };
  users: {
    list: () => Promise<unknown[]>;
    get: (input: { user_id: number }) => Promise<unknown>;
    create: (input: Record<string, unknown>) => Promise<unknown>;
    update: (input: { user_id: number; data: Record<string, unknown> }) => Promise<unknown>;
    delete: (input: { user_id: number }) => Promise<unknown>;
    changePassword: (input: { user_id: number; new_password: string; confirm_password: string }) => Promise<unknown>;
    telegramAuthUrl: (input: { user_id: number }) => Promise<{ url?: string }>;
    disconnectTelegram: (input: { user_id: number }) => Promise<unknown>;
    maxAuthUrl: (input: { user_id: number }) => Promise<{ url?: string; manual_instruction?: string; token?: string }>;
    disconnectMax: (input: { user_id: number }) => Promise<unknown>;
  };
  settings: {
    getPrompts: () => Promise<unknown[]>;
    updatePrompts: (input: Record<string, unknown>) => Promise<unknown>;
    getModels: () => Promise<{ models: Record<string, unknown>; current_model: string }>;
    backup: () => Promise<{ success: boolean; path?: string }>;
  };
  statistics: {
    getStatistics: (input?: Record<string, unknown>) => Promise<{ statistics: unknown[]; date_from: string; date_to: string }>;
    getMetrics: () => Promise<unknown>;
  };
  reports: {
    sendTestTelegram: () => Promise<void>;
  };
}

let clientInstance: BackendApi | null = null;

export function getApiClient(): BackendApi {
  if (!clientInstance) {
    clientInstance = createBackendClient(getApiBaseUrl()) as unknown as BackendApi;
  }
  return clientInstance;
}

export const api = getApiClient();
export { getApiBaseUrl as getAPI_BASE_URL };
