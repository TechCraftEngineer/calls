/** Email пользователя из контекста oRPC (если есть). */
export function getUserEmail(user: unknown): string | undefined {
  return typeof user === "object" && user
    ? "email" in user && typeof (user as { email?: unknown }).email === "string"
      ? (user as { email: string }).email
      : undefined
    : undefined;
}
