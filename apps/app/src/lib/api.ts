/**
 * API слой приложения.
 * oRPC для основного API, fetch для auth и legacy эндпоинтов.
 */

import { api, getAPI_BASE_URL } from "./orpc";

export { api };
export const API_BASE_URL = getAPI_BASE_URL();

/** REST fetch для auth и эндпоинтов без oRPC (credentials: include для cookies) */
export async function restFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const base = API_BASE_URL.replace(/\/?$/, "");
  const url = path.startsWith("http")
    ? path
    : `${base}/api${path.startsWith("/") ? "" : "/"}${path}`;
  return fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

/** REST POST JSON */
export async function restPost<T = unknown>(
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await restFetch(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string })?.detail ?? res.statusText);
  }
  return res.json();
}

/** REST GET JSON */
export async function restGet<T = unknown>(path: string): Promise<T> {
  const res = await restFetch(path, { method: "GET" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string })?.detail ?? res.statusText);
  }
  return res.json();
}

export default api;
