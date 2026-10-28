import { DrawSignatureProvider } from './signature/draw.provider';
import { TypedSignatureProvider } from './signature/typed.provider';
import { NoopStampProvider } from './stamp/noop-stamp.provider';
import type { SignatureMethod, SignatureProvider, StampProvider, VerificationMethod, VerificationProvider } from './types';
import { EmailOtpVerificationProvider } from './verification/email-otp.provider';

export * from './types';
export { DrawSignatureProvider, TypedSignatureProvider, EmailOtpVerificationProvider, NoopStampProvider };

/**
 * Returns the appropriate VerificationProvider for the document configuration.
 */
export function getVerificationProvider(method: VerificationMethod): VerificationProvider {
  switch (method) {
    case 'email_otp':
      return new EmailOtpVerificationProvider();
    case 'aadhaar_otp':
      throw new Error('Aadhaar OTP verification provider is reserved for Phase 2');
    default:
      return new EmailOtpVerificationProvider();
  }
}

/**
 * Returns the appropriate SignatureProvider for the document configuration.
 */
export function getSignatureProvider(method: SignatureMethod): SignatureProvider {
  switch (method) {
    case 'draw':
      return new DrawSignatureProvider();
    case 'typed':
      return new TypedSignatureProvider();
    case 'aadhaar_esign':
      throw new Error('Aadhaar eSign signature provider is reserved for Phase 2');
    case 'auto_seal':
      throw new Error('Auto seal signature provider is reserved for Phase 2');
    default:
      return new DrawSignatureProvider();
  }
}

/**
 * Returns the active StampProvider.
 */
export function getStampProvider(): StampProvider {
  return new NoopStampProvider();
}
