/** Email пользователя из контекста oRPC (если есть). */
function isUserWithEmail(user: unknown): user is { email: string } {
  return (
    typeof user === "object" &&
    user !== null &&
    "email" in user &&
    typeof (user as { email?: unknown }).email === "string"
  );
}

export function getUserEmail(user: unknown): string | undefined {
  return isUserWithEmail(user) ? user.email : undefined;
}
