/**
 * Authentication service - handles password verification and related operations
 */

import { compareSync } from "bcryptjs";
import type { UsersRepository } from "../repositories/users.repository";

export class AuthService {
  constructor(private usersRepository: UsersRepository) {}

  async verifyPassword(username: string, password: string): Promise<boolean> {
    const user = await this.usersRepository.findByUsername(username);
    if (!user || !user.passwordHash) return false;

    if (user.passwordHash.startsWith("pbkdf2:sha256")) {
      return this.verifyWerkzeugHash(password, user.passwordHash);
    }
    return compareSync(password, user.passwordHash);
  }

  async verifyWerkzeugHash(
    password: string,
    fullHash: string,
  ): Promise<boolean> {
    const { pbkdf2Sync } = await import("node:crypto");

    const parts = fullHash.split("$");
    if (parts.length < 4) return false;
    const [, method, saltB64, hashB64] = parts;
    if (method !== "pbkdf2:sha256" || !saltB64 || !hashB64) return false;

    const salt = Buffer.from(saltB64, "base64");
    const iterMatch = fullHash.match(/\$(\d+)\$/);
    const iterations = iterMatch?.[1] ? parseInt(iterMatch[1], 10) : 260000;
    const keylen = 32;
    const derived = pbkdf2Sync(password, salt, iterations, keylen, "sha256");
    const derivedB64 = derived.toString("base64").replace(/=/g, "");
    return derivedB64 === hashB64;
  }
}
