/**
 * Backend server configuration.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const corsOrigin =
  process.env.CORS_ORIGINS?.split(",")[0] ?? "http://localhost:3000";

export const port = Number(
  process.env.BACKEND_PORT ?? process.env.PORT ?? 8000,
);

export function getRecordsDir(): string {
  const isDocker =
    process.env.DEPLOYMENT_ENV === "docker" || existsSync("/.dockerenv");
  if (isDocker) return "/app/records";
  const projectRoot = resolve(__dirname, "../../..");
  return resolve(projectRoot, "records");
}
