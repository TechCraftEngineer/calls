/**
 * Better Auth configuration for backend-server.
 * Uses SQLite + username plugin for calls app authentication.
 */

import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import Database from "better-sqlite3";
import { resolve, dirname } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getAuthDbPath(): string {
  if (process.env.BACKEND_AUTH_DB_PATH) return process.env.BACKEND_AUTH_DB_PATH;
  const isDocker =
    process.env.DEPLOYMENT_ENV === "docker" ||
    (process.platform !== "win32" && existsSync("/.dockerenv"));
  if (isDocker) return "/app/data/auth.sqlite";
  const projectRoot = resolve(__dirname, "../..");
  return resolve(projectRoot, "backend/data/auth.sqlite");
}

const dbPath = getAuthDbPath();
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const baseUrl = process.env.BACKEND_URL ?? process.env.APP_URL ?? "http://localhost:8000";

export const auth = betterAuth({
  database: new Database(dbPath),
  baseURL: baseUrl,
  secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [username()],
  user: {
    additionalFields: {
      internal_numbers: { type: "string", required: false },
      mobile_numbers: { type: "string", required: false },
      telegram_chat_id: { type: "string", required: false },
      first_name: { type: "string", required: false },
      last_name: { type: "string", required: false },
    },
  },
});

export type Auth = typeof auth;
