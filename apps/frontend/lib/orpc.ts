/**
 * oRPC client for backend-api.
 * Основной API клиент приложения.
 */

import { createBackendClient } from "@acme/backend-api-client";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) return envUrl.replace(/\/(api|\/api\/)?$/, "");
    if (window.location.origin.includes("zvonki.qbs.ru"))
      return "https://zvonki.qbs.ru";
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/(api|\/api\/)?$/, "") ||
    "http://localhost:8000"
  );
}

let clientInstance: any = null;

export function getApiClient(): any {
  if (!clientInstance) {
    clientInstance = createBackendClient(getApiBaseUrl());
  }
  return clientInstance;
}

export const api = getApiClient();
export { getApiBaseUrl as getAPI_BASE_URL };
