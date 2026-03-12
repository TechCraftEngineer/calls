/** Authentication utilities. */

import { restPost, restGet } from "./api";

export interface User {
  id: number;
  username: string;
  name: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  internal_numbers?: string | null;
  mobile_numbers?: string | null;
  [key: string]: unknown;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return restPost<LoginResponse>("/auth/login", { username, password });
}

export async function logout(): Promise<void> {
  await restPost("/auth/logout");
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await restGet<User>("/auth/me");
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  if (typeof document !== "undefined") {
    return document.cookie.includes("session=");
  }
  return false;
}
