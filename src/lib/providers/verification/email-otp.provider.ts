import { generateOtpCode, hashOtp, verifyHashTimingSafe } from '@/lib/security/crypto';
import type {
  VerificationProvider,
  VerificationStartParams,
  VerificationStartResult,
  VerificationVerifyParams,
  VerificationVerifyResult,
} from '../types';

export class EmailOtpVerificationProvider implements VerificationProvider {
  readonly method = 'email_otp' as const;

  async start(params: VerificationStartParams): Promise<VerificationStartResult> {
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return {
      success: true,
      expiresAt,
      cooldownSeconds: 60,
      message: `Verification code generated for ${params.email}`,
    };
  }

  async verify(params: VerificationVerifyParams): Promise<VerificationVerifyResult> {
    if (!params.code || params.code.length !== 6) {
      return { verified: false, error: 'Invalid 6-digit verification code' };
    }
    return { verified: true };
  }
}
