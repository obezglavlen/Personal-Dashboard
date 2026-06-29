import bcrypt from "bcryptjs";

/** Cost factor for bcrypt. 12 is a sensible default for interactive logins. */
const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password with bcrypt (salted, slow by design).
 * Returns the encoded hash string suitable for storage.
 */
export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a stored bcrypt hash.
 * Uses a constant-time comparison internally.
 */
export function verifyPassword(plaintext: string, storedHash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, storedHash);
}
