export function normalizePhoneNumberList(values?: string[] | null): string[] {
  return Array.from(
    new Set((values ?? []).map((value) => value.replace(/\D/g, "")).filter(Boolean)),
  );
}
