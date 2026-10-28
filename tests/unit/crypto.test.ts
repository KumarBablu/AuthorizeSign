import { describe, expect, it } from 'vitest';
import {
  computeSha256,
  generateOtpCode,
  generateSignerToken,
  hashOtp,
  hashToken,
  maskEmail,
  verifyHashTimingSafe,
} from '@/lib/security/crypto';

describe('Security & Cryptography Utilities', () => {
  it('generates a 32-byte base64url signer token', () => {
    const token = generateSignerToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(42);
    // Base64url characters only
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('hashes a token with SHA-256 producing 64-char hex string', () => {
    const token = 'sample_signer_token_12345';
    const hash = hashToken(token);
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    // Deterministic
    expect(hashToken(token)).toBe(hash);
  });

  it('generates 6-digit random numeric OTP codes', () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateOtpCode();
      expect(otp).toMatch(/^\d{6}$/);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThan(1000000);
    }
  });

  it('hashes OTP codes using signerId, code, and pepper', () => {
    const signerId = 'signer-uuid-1';
    const code = '123456';
    const pepper = 'secret_pepper_test_123';
    const hash1 = hashOtp(signerId, code, pepper);
    const hash2 = hashOtp(signerId, code, pepper);
    const hashDifferentCode = hashOtp(signerId, '654321', pepper);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDifferentCode);
    expect(hash1.length).toBe(64);
  });

  it('timingSafeEqual correctly validates matching and mismatching hashes', () => {
    const hashA = hashToken('token_A');
    const hashB = hashToken('token_A');
    const hashC = hashToken('token_C');

    expect(verifyHashTimingSafe(hashA, hashB)).toBe(true);
    expect(verifyHashTimingSafe(hashA, hashC)).toBe(false);
    expect(verifyHashTimingSafe('invalid', hashA)).toBe(false);
  });

  it('computes sha256 buffer hash accurately', () => {
    const buffer = Buffer.from('%PDF-1.4 test content');
    const hash = computeSha256(buffer);
    expect(hash.length).toBe(64);
    expect(hash).toBe(computeSha256(buffer));
  });

  it('masks email addresses properly for privacy', () => {
    expect(maskEmail('john.doe@example.com')).toBe('j•••@example.com');
    expect(maskEmail('alice@company.org')).toBe('a•••@company.org');
    expect(maskEmail('b@test.com')).toBe('b•••@test.com');
    expect(maskEmail('invalid')).toBe('•••');
  });
});
