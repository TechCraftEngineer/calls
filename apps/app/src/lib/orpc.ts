/**
 * oRPC client for backend-api.
 * API всегда через app: localhost:3000/api или app.zvonki.qbsoft.ru/api
 */

import type { BackendApiClient } from "@calls/api/client";
import { createBackendClient } from "@calls/api/client";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server: APP_SERVER_URL (k8s) или localhost:3000 (Next.js rewrites)
  const appUrl = process.env.APP_SERVER_URL;
  if (appUrl) return appUrl.replace(/\/?$/, "");
  return `http://localhost:${process.env.PORT || 3000}`;
}

let clientInstance: BackendApiClient | null = null;

export function getApiClient(): BackendApiClient {
  if (!clientInstance) {
    clientInstance = createBackendClient(getApiBaseUrl());
  }
  return clientInstance;
}

export const api = getApiClient();
export { getApiBaseUrl as getAPI_BASE_URL };
