/** Форматирует опциональное значение или возвращает placeholder */
export function formatOptional<T>(
  value: T | null | undefined,
  formatter: (val: T) => string,
  placeholder = "—",
): string {
  return value !== null && value !== undefined ? formatter(value) : placeholder;
}

/** Маскирует email для безопасного отображения */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "***";

  const safeLocal =
    local.length <= 2 ? (local[0] ?? "*") : `${local[0] ?? "*"}***${local.at(-1) ?? "*"}`;

  const [domName, domTld] = domain.split(".");
  if (!domName) return "***";

  const safeDomName =
    domName.length <= 2 ? (domName[0] ?? "*") : `${domName[0] ?? "*"}***${domName.at(-1) ?? "*"}`;

  return `${safeLocal}@${safeDomName}.${domTld ?? "***"}`;
}
