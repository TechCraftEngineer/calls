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

  const globalCrypto = globalThis.crypto as Crypto | undefined;
  if (globalCrypto?.getRandomValues) {
    globalCrypto.getRandomValues(array);
  } else {
    throw new Error(
      "Web Crypto API is not available. This environment does not support cryptographically secure random number generation.",
    );
  }

  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
