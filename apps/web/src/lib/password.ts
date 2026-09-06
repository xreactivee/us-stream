import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

export async function hashRoomPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH);

  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyRoomPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltPart, hashPart] = stored.split("$");

  if (scheme !== "scrypt" || !saltPart || !hashPart) {
    return false;
  }

  const expected = Buffer.from(hashPart, "base64url");
  const derived = await scryptAsync(
    password.normalize("NFKC"),
    Buffer.from(saltPart, "base64url"),
    expected.length,
  );

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
