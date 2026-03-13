/** Authentication utilities. */

import {
  getCurrentUser as betterAuthGetCurrentUser,
  isAuthenticated as betterAuthIsAuthenticated,
  login as betterAuthLogin,
  logout as betterAuthLogout,
} from "./better-auth";

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

export const login = betterAuthLogin;
export const logout = betterAuthLogout;
export const getCurrentUser = betterAuthGetCurrentUser;
/** @deprecated В React используйте useAuth().isAuthenticated. Для async — getCurrentUser() !== null. */
export const isAuthenticated = betterAuthIsAuthenticated;
