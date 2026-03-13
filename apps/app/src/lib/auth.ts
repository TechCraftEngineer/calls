/** Authentication utilities. */

import {
  getCurrentUser as betterAuthGetCurrentUser,
  isAuthenticated as betterAuthIsAuthenticated,
  login as betterAuthLogin,
  logout as betterAuthLogout,
  signUp as betterAuthSignUp,
} from "./better-auth";

export interface User {
  id: number;
  username: string;
  name: string;
  givenName?: string;
  familyName?: string;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
  role?: string;
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
export const signUp = betterAuthSignUp;
export const isAuthenticated = betterAuthIsAuthenticated;
