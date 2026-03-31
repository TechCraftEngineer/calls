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

function parseInternalExtensions(ext: string | null | undefined): string[] {
  if (!ext || String(ext).trim().toLowerCase() === "all") return [];
  return ext
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

export type ManagerInfo = { userId: string; displayName: string };

/**
 * Строит карту internalNumber -> сотрудник воркспейса.
 * Используется для привязки звонков к участникам по internal_extensions.
 */
export function buildInternalNumberToManagerMap(
  members: Array<{
    user?: {
      id: string;
      givenName?: string | null;
      familyName?: string | null;
      name?: string | null;
      internalExtensions?: string | null;
    } | null;
  }>,
): Map<string, ManagerInfo> {
  const map = new Map<string, ManagerInfo>();
  for (const m of members) {
    const user = m.user;
    if (!user?.id) continue;
    const extensions = parseInternalExtensions(user.internalExtensions);
    const displayName = getDisplayName(user);
    for (const ext of extensions) {
      map.set(ext, { userId: user.id, displayName });
    }
  }
  return map;
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

export function getInternalNumbersForUser(user: Record<string, unknown>): string[] | undefined {
  const nums = user.internalExtensions as string | undefined;
  if (!nums || String(nums).trim().toLowerCase() === "all") return undefined;
  return (
    nums
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) || undefined
  );
}

export function getMobileNumbersForUser(user: Record<string, unknown>): string[] | undefined {
  const nums = user.mobilePhones as string | undefined;
  if (!nums?.trim()) return undefined;
  return (
    nums
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) || undefined
  );
}
