import type {
  SignatureCompleteParams,
  SignatureCompleteResult,
  SignatureInitiateParams,
  SignatureInitiateResult,
  SignatureProvider,
} from '../types';

export class TypedSignatureProvider implements SignatureProvider {
  readonly method = 'typed' as const;

  async initiate(params: SignatureInitiateParams): Promise<SignatureInitiateResult> {
    return {
      clientConfig: {
        mode: 'typed',
        availableFonts: ['Dancing Script', 'Caveat', 'Pacifico'],
        fieldsCount: params.fields.length,
      },
    };
  }

  async complete(params: SignatureCompleteParams): Promise<SignatureCompleteResult> {
    if (!params.payload.pngBase64) {
      return {
        success: false,
        error: 'Missing typed signature image data',
      };
    }

    return {
      success: true,
      signatureId: `sig_${Date.now()}`,
      certInfo: {
        type: 'typed_cursive',
        font: params.payload.typedFont || 'Dancing Script',
        ip: params.payload.ipAddress,
        userAgent: params.payload.userAgent,
        signedAt: new Date().toISOString(),
      },
    };
  }
}
