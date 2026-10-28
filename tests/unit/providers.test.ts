import { describe, expect, it } from 'vitest';
import {
  DrawSignatureProvider,
  getSignatureProvider,
  getStampProvider,
  getVerificationProvider,
  NoopStampProvider,
  TypedSignatureProvider,
} from '@/lib/providers';

describe('Pluggable Provider Architecture', () => {
  it('resolves EmailOtpVerificationProvider for email_otp method', () => {
    const provider = getVerificationProvider('email_otp');
    expect(provider.method).toBe('email_otp');
  });

  it('rejects un-configured verification methods with clean error', () => {
    expect(() => getVerificationProvider('aadhaar_otp')).toThrow(
      'Aadhaar OTP verification provider is reserved for Phase 2'
    );
  });

  it('resolves DrawSignatureProvider and verifies draw completion payload', async () => {
    const provider = getSignatureProvider('draw');
    expect(provider).toBeInstanceOf(DrawSignatureProvider);

    const init = await provider.initiate({
      documentId: 'doc_1',
      signerId: 'signer_1',
      fields: [{ id: 'f1', page: 1, x: 0.1, y: 0.2, width: 0.3, height: 0.1 }],
    });
    expect(init.clientConfig?.mode).toBe('canvas');

    const result = await provider.complete({
      documentId: 'doc_1',
      signerId: 'signer_1',
      payload: {
        pngBase64: 'data:image/png;base64,iVBORw0KGgo...',
        consentText: 'I agree to sign this document electronically',
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest/Test',
      },
    });

    expect(result.success).toBe(true);
    expect(result.certInfo?.type).toBe('draw_canvas');
  });

  it('resolves TypedSignatureProvider and verifies cursive font selection', async () => {
    const provider = getSignatureProvider('typed');
    expect(provider).toBeInstanceOf(TypedSignatureProvider);

    const init = await provider.initiate({
      documentId: 'doc_1',
      signerId: 'signer_1',
      fields: [],
    });
    expect(init.clientConfig?.availableFonts).toContain('Dancing Script');
    expect(init.clientConfig?.availableFonts).toContain('Caveat');
    expect(init.clientConfig?.availableFonts).toContain('Pacifico');

    const result = await provider.complete({
      documentId: 'doc_1',
      signerId: 'signer_1',
      payload: {
        pngBase64: 'data:image/png;base64,iVBORw0KGgo...',
        typedFont: 'Caveat',
        consentText: 'I agree to sign this document electronically',
      },
    });

    expect(result.success).toBe(true);
    expect(result.certInfo?.font).toBe('Caveat');
  });

  it('resolves NoopStampProvider returning simulated stamp reference', async () => {
    const provider = getStampProvider();
    expect(provider).toBeInstanceOf(NoopStampProvider);

    const result = await provider.createStamp('MH', 100, [
      { name: 'Acme Corp', role: 'first_party' },
      { name: 'Beta Ltd', role: 'second_party' },
    ]);

    expect(result.stampRef).toMatch(/^NOOP-\d+$/);
    expect(result.stampAmount).toBe(100);
  });
});
