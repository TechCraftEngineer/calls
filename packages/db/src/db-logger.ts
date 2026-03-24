import { env } from "@calls/config";

export function isDbLoggingEnabled(): boolean {
  return env.DB_LOGGER;
}
