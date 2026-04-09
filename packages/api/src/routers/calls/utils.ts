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

function getDisplayName(u: {
  givenName?: string | null;
  familyName?: string | null;
  name?: string | null;
}): string {
  const given = (u.givenName ?? "").trim();
  const family = (u.familyName ?? "").trim();
  return [given, family].filter(Boolean).join(" ") || (u.name ?? "").trim() || "—";
}

/**
 * Возвращает отображаемое имя пользователя (givenName + familyName или name).
 */
export function getDisplayNameFromUser(u: {
  givenName?: string | null;
  familyName?: string | null;
  name?: string | null;
}): string {
  return getDisplayName(u);
}

export type UserWithMobilePhones = {
  id: string;
  givenName?: string | null;
  familyName?: string | null;
  name?: string | null;
  mobilePhones?: string | null;
};

export function getMobileNumbersForUser(user: UserWithMobilePhones): string[] | undefined {
  const nums = user.mobilePhones;
  if (!nums?.trim()) return undefined;
  const result = nums
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return result.length > 0 ? result : undefined;
}
