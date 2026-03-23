export function isDbLoggingEnabled(): boolean {
  const flag = process.env.DB_LOGGER?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes" || flag === "on") {
    return true;
  }
  return false;
}
