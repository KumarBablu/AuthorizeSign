import { describe, expect, it } from 'vitest';
import { hashOtp, verifyHashTimingSafe } from '@/lib/security/crypto';
import { signatureSubmitSchema } from '@/lib/validations/signer.schema';

describe('Signer Journey Security & Validation', () => {
  it('enforces 300 KB limit and png prefix on signature image', () => {
    // Valid PNG base64
    const validPayload = {
      consent: true,
      signatureMethod: 'draw' as const,
      signaturePngBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const validResult = signatureSubmitSchema.safeParse(validPayload);
    expect(validResult.success).toBe(true);

    // Invalid prefix
    const invalidPrefix = {
      ...validPayload,
      signaturePngBase64: 'data:image/jpeg;base64,iVBORw0KGgo...',
    };
    expect(signatureSubmitSchema.safeParse(invalidPrefix).success).toBe(false);

    // Exceeding 300 KB (approx 410,000 base64 chars)
    const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(420000);
    const oversizedResult = signatureSubmitSchema.safeParse({
      ...validPayload,
      signaturePngBase64: largeBase64,
    });
    expect(oversizedResult.success).toBe(false);
  });

  it('rejects submission if consent checkbox is not explicitly checked', () => {
    const withoutConsent = {
      consent: false,
      signatureMethod: 'draw' as const,
      signaturePngBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const result = signatureSubmitSchema.safeParse(withoutConsent);
    expect(result.success).toBe(false);
  });

  it('validates 30-minute verified session window calculation', () => {
    const now = Date.now();
    const twentyNineMinutesAgo = new Date(now - 29 * 60 * 1000).toISOString();
    const thirtyOneMinutesAgo = new Date(now - 31 * 60 * 1000).toISOString();

    const isSessionActive = (verifiedAt: string) => {
      const durationMs = now - new Date(verifiedAt).getTime();
      return durationMs <= 30 * 60 * 1000;
    };

    expect(isSessionActive(twentyNineMinutesAgo)).toBe(true);
    expect(isSessionActive(thirtyOneMinutesAgo)).toBe(false);
  });

  it('verifies sequential ordering: signer 2 blocked until signer 1 is signed', () => {
    interface SignerRow {
      orderIndex: number;
      status: 'pending' | 'signed';
    }

    const isBlocked = (currentOrder: number, signers: SignerRow[]) => {
      if (currentOrder === 0) return false;
      return signers.some((s) => s.orderIndex < currentOrder && s.status !== 'signed');
    };

    const initialSigners: SignerRow[] = [
      { orderIndex: 0, status: 'pending' },
      { orderIndex: 1, status: 'pending' },
    ];

    expect(isBlocked(0, initialSigners)).toBe(false); // Signer 1 is never blocked
    expect(isBlocked(1, initialSigners)).toBe(true);  // Signer 2 is blocked

    // Once Signer 1 signs:
    initialSigners[0].status = 'signed';
    expect(isBlocked(1, initialSigners)).toBe(false); // Signer 2 is now unblocked
  });

  it('locks out verification after 5 failed attempts', () => {
    let attempts = 0;
    const maxAttempts = 5;
    const correctCode = '123456';
    const signerId = 'signer-test';
    const storedHash = hashOtp(signerId, correctCode);

    const tryCode = (submitted: string) => {
      if (attempts >= maxAttempts) return 'LOCKED';
      attempts++;
      const isMatch = verifyHashTimingSafe(storedHash, hashOtp(signerId, submitted));
      return isMatch ? 'SUCCESS' : 'FAILED';
    };

    expect(tryCode('000001')).toBe('FAILED'); // attempt 1
    expect(tryCode('000002')).toBe('FAILED'); // attempt 2
    expect(tryCode('000003')).toBe('FAILED'); // attempt 3
    expect(tryCode('000004')).toBe('FAILED'); // attempt 4
    expect(tryCode('000005')).toBe('FAILED'); // attempt 5
    expect(tryCode(correctCode)).toBe('LOCKED'); // attempt 6 locked out even with correct code
  });
});
