// =============================================================================
// Pluggable Provider Interfaces for AuthSign
// Allows adding Aadhaar eSign and e-Stamping without modifying core workflows
// =============================================================================

export type VerificationMethod = 'email_otp' | 'aadhaar_otp';
export type SignatureMethod = 'draw' | 'typed' | 'aadhaar_esign' | 'auto_seal';

// -----------------------------------------------------------------------------
// Verification Provider Interface
// -----------------------------------------------------------------------------
export interface VerificationStartParams {
  signerId: string;
  email: string;
  phone?: string;
  documentTitle: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface VerificationStartResult {
  success: boolean;
  expiresAt: Date;
  cooldownSeconds?: number;
  message?: string;
}

export interface VerificationVerifyParams {
  signerId: string;
  code: string;
  ipAddress?: string;
}

export interface VerificationVerifyResult {
  verified: boolean;
  error?: string;
}

export interface VerificationProvider {
  readonly method: VerificationMethod;
  start(params: VerificationStartParams): Promise<VerificationStartResult>;
  verify(params: VerificationVerifyParams): Promise<VerificationVerifyResult>;
}

// -----------------------------------------------------------------------------
// Signature Provider Interface
// -----------------------------------------------------------------------------
export interface SignatureFieldTarget {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SignatureInitiateParams {
  documentId: string;
  signerId: string;
  fields: SignatureFieldTarget[];
}

export interface SignatureInitiateResult {
  redirectUrl?: string; // For redirect-based eSign (e.g. CDSL/NSDL Aadhaar gateway)
  clientConfig?: Record<string, unknown>;
}

export interface SignatureCompleteParams {
  documentId: string;
  signerId: string;
  payload: {
    pngBase64?: string;
    typedFont?: string;
    consentText: string;
    ipAddress?: string;
    userAgent?: string;
    externalTxnId?: string;
  };
}

export interface SignatureCompleteResult {
  success: boolean;
  signatureId?: string;
  certInfo?: Record<string, unknown>; // Aadhaar ESP cert details when available
  error?: string;
}

export interface SignatureProvider {
  readonly method: SignatureMethod;
  initiate(params: SignatureInitiateParams): Promise<SignatureInitiateResult>;
  complete(params: SignatureCompleteParams): Promise<SignatureCompleteResult>;
}

// -----------------------------------------------------------------------------
// Stamp Provider Interface (for Digital E-Stamping)
// -----------------------------------------------------------------------------
export interface StampParty {
  name: string;
  role: 'first_party' | 'second_party';
}

export interface StampResult {
  stampRef: string;
  stampAmount: number;
  stampCertificateUrl?: string;
}

export interface StampProvider {
  createStamp(state: string, amount: number, parties: StampParty[]): Promise<StampResult>;
}
