/**
 * Server-side Better Auth configuration
 * Used for RSC and Server Actions
 */

import { initAuth } from "@calls/auth";
import { username } from "better-auth/plugins";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000";
const productionUrl = process.env.PRODUCTION_URL || "https://zvonki.qbs.ru";

export const auth = initAuth({
  baseUrl,
  productionUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  extraPlugins: [username()],
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];
