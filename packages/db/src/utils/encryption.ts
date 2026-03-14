/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for encryption at rest
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/**
 * Get encryption key from environment
 * Should be a 32-byte (256-bit) key
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Ensure key is 32 bytes
  return Buffer.from(key.padEnd(32, "0").slice(0, 32));
}

/**
 * Encrypt a string value
 * Returns: iv:authTag:encryptedData (all base64 encoded)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt an encrypted string
 * Expects format: iv:authTag:encryptedData
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData;

  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const [ivPart, authTagPart, encryptedPart] = parts;
    if (!ivPart || !authTagPart || !encryptedPart) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(ivPart, "base64");
    const authTag = Buffer.from(authTagPart, "base64");
    const encrypted = encryptedPart;

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Encrypt multiple fields in an object
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value) {
      result[field] = encrypt(value) as T[keyof T];
    }
  }
  return result;
}

/**
 * Decrypt multiple fields in an object
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value) {
      try {
        result[field] = decrypt(value) as T[keyof T];
      } catch {
        // If decryption fails, keep original value (might not be encrypted)
        console.warn(`Failed to decrypt field: ${String(field)}`);
      }
    }
  }
  return result;
}

/**
 * Hash a value using SHA-256 (for searchable encrypted fields)
 * Use this when you need to search by encrypted value
 */
export function hashForSearch(value: string): string {
  const crypto = require("node:crypto");
  return crypto.createHash("sha256").update(value).digest("hex");
}
