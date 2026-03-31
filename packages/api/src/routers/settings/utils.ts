import { SENSITIVE_KEYS } from "./constants";

export function maskSensitiveData(key: string, value: string): string {
  return SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))
    ? `${value.substring(0, 3)}***`
    : value;
}
