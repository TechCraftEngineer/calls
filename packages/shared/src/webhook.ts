export const WEBHOOK_SECRET_BYTES = 32;

export const WEBHOOK_SECRET_MIN_LENGTH = WEBHOOK_SECRET_BYTES * 2; // hex encoding doubles the length

/**
 * Generate a cryptographically secure random secret.
 * Works in both Node.js and browser environments.
 * @param bytes Number of random bytes to generate (default: 32)
 * @returns Hex-encoded secret string
 */
export function generateSecureSecret(bytes = 32): string {
  const array = new Uint8Array(bytes);

  // Use crypto.getRandomValues if available (browser and modern Node.js)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalCrypto = (globalThis as any).crypto;
  if (globalCrypto?.getRandomValues) {
    globalCrypto.getRandomValues(array);
  } else {
    // Fallback for older environments using Math.random
    // Note: This is less secure and should only be used as a last resort
    for (let i = 0; i < bytes; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
