import { shake_256 } from "js-sha3";

/**
 * Hash a password using SHAKE-256 with an output length derived from
 * the input password length (passwordL * 4 bits). Returns the digest
 * as an array of individual hex characters (the result of .split("")).
 */
export function hashPassword(inputPass: string): string[] {
  const hash = shake_256(inputPass, 256);
  return hash.split("").slice(0, 16);
}

/**
 * Join the character array back into a hex string for storage / comparison.
 */
export function joinHash(chars: string[]): string {
  return chars.join("");
}

/**
 * Verify a plaintext password against a stored character-array hash.
 */
export function verifyPassword(inputPass: string, stored: string[] | string): boolean {
  const storedStr = Array.isArray(stored) ? stored.join("") : stored;
  const computed = hashPassword(inputPass).join("");
  return computed === storedStr;
}
