/** Authentication utilities. */

import type { authClient } from "./better-auth";
import {
  getCurrentUser as betterAuthGetCurrentUser,
  isAuthenticated as betterAuthIsAuthenticated,
  login as betterAuthLogin,
  logout as betterAuthLogout,
  signUp as betterAuthSignUp,
} from "./better-auth";

// Infer types from Better Auth client
export type Session = typeof authClient.$Infer.Session;
export type User = (typeof authClient.$Infer.Session)["user"];

export const login = betterAuthLogin;
export const logout = betterAuthLogout;
export const getCurrentUser = betterAuthGetCurrentUser;
export const signUp = betterAuthSignUp;
export const isAuthenticated = betterAuthIsAuthenticated;
