/**
 * Runtime type validation utilities for critical settings
 */

export function validateString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value.trim();
}

export function validateOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error("Value must be a string or null");
  }
  return value.trim() || null;
}

export function validateMegafonSettings(settings: {
  host: unknown;
  user: unknown;
  password: unknown;
}): { host: string; user: string; password: string } {
  return {
    host: validateString(settings.host, "MEGAFON_FTP_HOST"),
    user: validateString(settings.user, "MEGAFON_FTP_USER"),
    password: validateString(settings.password, "MEGAFON_FTP_PASSWORD"),
  };
}
