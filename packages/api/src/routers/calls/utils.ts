const LEGACY_ADMIN_USERNAMES = ["admin@mango", "admin@gmail.com"];

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getInternalNumbersForUser(
  user: Record<string, unknown>,
): string[] | undefined {
  const username = (user.username ?? user.email ?? "") as string;
  if (LEGACY_ADMIN_USERNAMES.includes(username)) return undefined;
  const nums = user.internalExtensions as string | undefined;
  if (!nums || String(nums).trim().toLowerCase() === "all") return undefined;
  return (
    nums
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) || undefined
  );
}

export function getMobileNumbersForUser(
  user: Record<string, unknown>,
): string[] | undefined {
  const nums = user.mobilePhones as string | undefined;
  if (!nums?.trim()) return undefined;
  return (
    nums
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) || undefined
  );
}
