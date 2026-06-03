import crypto from 'crypto';

/**
 * Hashes a password using PBKDF2 with SHA-512 and a random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against an existing PBKDF2 salt:hash string.
 */
export function verifyPassword(password: string, hashWithSalt: string): boolean {
  if (!hashWithSalt || !hashWithSalt.includes(':')) {
    return false;
  }
  const [salt, originalHash] = hashWithSalt.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}
