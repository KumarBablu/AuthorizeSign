import crypto from 'node:crypto';

/**
 * Generate a cryptographically secure 32-byte base64url signer token.
 */
export function generateSignerToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Computes SHA-256 hex digest of a signer token.
 * Only this hash is stored in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a 6-digit random numeric OTP code.
 */
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes SHA-256(signerId:code:OTP_PEPPER).
 */
export function hashOtp(signerId: string, code: string, pepper?: string): string {
  const activePepper = pepper || process.env.OTP_PEPPER || 'default_authsign_pepper_min_32_chars_2026';
  return crypto
    .createHash('sha256')
    .update(`${signerId}:${code}:${activePepper}`)
    .digest('hex');
}

/**
 * Compares two hex hashes in constant time to prevent timing attacks.
 */
export function verifyHashTimingSafe(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Computes SHA-256 hex digest of a binary Buffer.
 */
export function computeSha256(buffer: Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Masks an email for privacy (e.g., "john.doe@example.com" -> "j•••@example.com").
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '•••';
  if (local.length <= 1) {
    return `${local}•••@${domain}`;
  }
  return `${local[0]}•••@${domain}`;
}
