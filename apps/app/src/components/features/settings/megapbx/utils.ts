export const WEBHOOK_SECRET_BYTES = 32;

export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(WEBHOOK_SECRET_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
