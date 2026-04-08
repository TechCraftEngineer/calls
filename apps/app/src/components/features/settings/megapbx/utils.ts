import { WEBHOOK_SECRET_BYTES } from "@calls/shared";

export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(WEBHOOK_SECRET_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const trimmedName = name.trim();
  if (!trimmedName) return "?";
  return trimmedName
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
