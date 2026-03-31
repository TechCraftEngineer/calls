/**
 * Шифрование чувствительных данных (пароли интеграций) при хранении в БД.
 * AES-256-GCM с уникальным IV для каждой операции.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/** Префикс зашифрованного значения для обратной совместимости */
const ENCRYPTED_PREFIX = "enc:";

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_KEY или BETTER_AUTH_SECRET должен быть задан для шифрования паролей",
    );
  }
  return createHash("sha256").update(secret).digest();
}

/**
 * Шифрует строку. Результат: "enc:" + base64(iv + ciphertext + authTag)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return ENCRYPTED_PREFIX + combined.toString("base64");
}

/**
 * Расшифровывает строку. Если значение не зашифровано (нет префикса enc:),
 * возвращает как есть (обратная совместимость для миграции).
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) return "";
  if (!encrypted.startsWith(ENCRYPTED_PREFIX)) {
    return encrypted;
  }
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encrypted.slice(ENCRYPTED_PREFIX.length), "base64");
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
  } catch {
    return encrypted;
  }
}
