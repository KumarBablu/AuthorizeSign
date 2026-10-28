import type {
  SignatureCompleteParams,
  SignatureCompleteResult,
  SignatureInitiateParams,
  SignatureInitiateResult,
  SignatureProvider,
} from '../types';

export class DrawSignatureProvider implements SignatureProvider {
  readonly method = 'draw' as const;

  async initiate(params: SignatureInitiateParams): Promise<SignatureInitiateResult> {
    return {
      clientConfig: {
        mode: 'canvas',
        strokeColor: '#0f172a',
        lineWidth: 2.5,
        fieldsCount: params.fields.length,
      },
    };
  }

  async complete(params: SignatureCompleteParams): Promise<SignatureCompleteResult> {
    if (!params.payload.pngBase64) {
      return {
        success: false,
        error: 'Missing drawn signature image data',
      };
    }

    return {
      success: true,
      signatureId: `sig_${Date.now()}`,
      certInfo: {
        type: 'draw_canvas',
        ip: params.payload.ipAddress,
        userAgent: params.payload.userAgent,
        signedAt: new Date().toISOString(),
      },
    };
  }
}
