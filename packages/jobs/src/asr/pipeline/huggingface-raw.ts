export function parseHuggingFaceRaw(
  raw: unknown,
): { model?: string; revision?: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Record<string, unknown>;
  const model = typeof parsed.model === "string" ? parsed.model : undefined;
  const revision =
    typeof parsed.revision === "string" ? parsed.revision : undefined;
  return { model, revision };
}
