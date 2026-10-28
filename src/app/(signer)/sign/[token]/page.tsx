'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  Clock,
  Download,
  FileSignature,
  FileText,
  KeyRound,
  Lock,
  Mail,
  PenTool,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { SignatureModal } from '@/components/signer/signature-modal';

type SignerState =
  | 'loading'
  | 'completed'
  | 'expired'
  | 'already_signed_by_you'
  | 'blocked'
  | 'ready_to_verify'
  | 'ready_to_sign'
  | 'signed_done';

export default function SignerFlowPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<SignerState>('loading');
  const [docInfo, setDocInfo] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSentNotice, setOtpSentNotice] = useState(false);

  // Signature State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<'draw' | 'typed'>('draw');
  const [typedFont, setTypedFont] = useState<string | undefined>(undefined);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);

  // Fetch initial token status
  useEffect(() => {
    async function checkToken() {
      try {
        const res = await fetch(`/api/sign/${token}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to verify signing link');
        }
        setDocInfo(data);
        setState(data.state as SignerState);
      } catch (err: any) {
        setErrorMessage(err.message || 'Invalid or expired signing link');
        setState('expired');
      }
    }
    if (token) {
      checkToken();
    }
  }, [token]);

  // Handle Send OTP
  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/sign/${token}/otp/send`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }
      setOtpSentNotice(true);
      if (data.devCode) {
        setOtpCode(data.devCode);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/sign/${token}/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      setState('ready_to_sign');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Signature Adoption
  const handleAdoptSignature = (png: string, method: 'draw' | 'typed', font?: string) => {
    setSignatureDataUrl(png);
    setSignatureMethod(method);
    setTypedFont(font);
    setIsModalOpen(false);
  };

  // Handle Final Submit
  const handleSubmitSignature = async () => {
    if (!signatureDataUrl) {
      setErrorMessage('Please create your signature first.');
      return;
    }
    if (!consentChecked) {
      setErrorMessage('You must agree to the electronic signature consent before submitting.');
      return;
    }

    setIsSubmittingSignature(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/sign/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signaturePngBase64: signatureDataUrl,
          signatureMethod,
          typedFont,
          consent: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit signature');
      }

      setState('completed');
      setDocInfo((prev: any) => ({
        ...prev,
        downloadUrl: data.downloadUrl || prev?.downloadUrl,
      }));
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <FileSignature className="w-4 h-4" />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">
              Auth<span className="text-blue-600">Sign</span>
            </span>
          </div>
          <div className="flex items-center text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Encrypted &amp; Secure
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* LOADING STATE */}
        {state === 'loading' && (
          <div className="text-center p-12 text-slate-400 text-sm">
            Verifying secure signing link...
          </div>
        )}

        {/* STATE 1: COMPLETED (Green checkmark any time, any day) */}
        {state === 'completed' && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md text-center space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">Document has been signed</h2>
              <p className="text-sm text-slate-500">
                &quot;{docInfo?.title || 'Document'}&quot; has been fully signed and executed by all parties.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-700">Cryptographically Certified</div>
              <p className="text-[11px] text-slate-500">
                A formal Certificate of Completion with tamper-evident SHA-256 checksums has been stamped.
              </p>
            </div>

            {docInfo?.downloadUrl && (
              <a
                href={docInfo.downloadUrl}
                download
                className="inline-flex items-center justify-center w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Signed Copy
              </a>
            )}
          </div>
        )}

        {/* STATE 2: EXPIRED (Time over, connect with org) */}
        {state === 'expired' && (
          <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-md text-center space-y-5">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <Clock className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">Signing Link Expired</h2>
              <p className="text-sm font-medium text-red-600">Time over</p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              This signing link has expired. Please connect with{' '}
              <strong>{docInfo?.organizationName || 'the organization'}</strong> to request a new signing link.
            </p>
          </div>
        )}

        {/* STATE 3: THIS SIGNER ALREADY SIGNED (Waiting for others) */}
        {state === 'already_signed_by_you' && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md text-center space-y-5">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900">You have signed this document</h2>
              <p className="text-xs text-slate-500">
                Your signature has been recorded. Waiting for the remaining signatories in sequence to finish.
              </p>
            </div>

            <p className="text-xs text-slate-400">
              You will receive an email containing the final executed PDF as soon as all parties complete signing.
            </p>
          </div>
        )}

        {/* STATE 4: BLOCKED BY SEQUENTIAL ORDER */}
        {state === 'blocked' && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md text-center space-y-5">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <Clock className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900">Awaiting Prior Signer</h2>
              <p className="text-xs text-slate-500">
                This document uses sequential signing order.
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              {docInfo?.message || `Awaiting signature from prior signer. You will be notified via email when it is your turn.`}
            </div>
          </div>
        )}

        {/* STATE 5: READY TO VERIFY (OTP Authentication) */}
        {state === 'ready_to_verify' && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-slate-900">{docInfo?.title}</h2>
              <p className="text-xs text-slate-500">
                Sent by {docInfo?.organizationName}
              </p>
            </div>

            {/* Masked Email Notice */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-xs text-slate-500">Signer Identity</div>
                <div className="text-sm font-semibold text-slate-800">{docInfo?.maskedEmail}</div>
              </div>
            </div>

            {!otpSentNotice ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed text-center">
                  To protect document confidentiality, we require two-factor verification. Click below to receive a 6-digit code at your email.
                </p>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSendingOtp ? 'Sending code...' : 'Send Verification Code'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 text-center uppercase tracking-wider">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center text-2xl font-mono tracking-widest py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-2 text-center">
                    Check your inbox for a 6-digit code. Valid for 10 minutes.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify & Continue'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp}
                    className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 text-center"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* STATE 6: READY TO SIGN (PDF Review + Signature Input) */}
        {state === 'ready_to_sign' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{docInfo?.title}</h2>
                  <p className="text-xs text-slate-500">Signer: {docInfo?.signerName}</p>
                </div>
                <span className="inline-flex items-center text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Verified Session
                </span>
              </div>

              {/* PDF Preview Frame */}
              <div className="w-full h-80 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col items-center justify-center relative">
                <iframe
                  src={`/api/sign/${token}/pdf`}
                  className="w-full h-full border-none"
                  title="Document Preview"
                />
              </div>

              {/* Signature Capture Trigger */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Required Action: Signature
                </label>

                {!signatureDataUrl ? (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-4 border-2 border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 transition-all"
                  >
                    <PenTool className="w-4 h-4 text-blue-600" />
                    <span>Click to create or draw your signature</span>
                  </button>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Adopted Signature:</span>
                      <img
                        src={signatureDataUrl}
                        alt="Signature Preview"
                        className="h-10 object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Legal Consent Checkbox */}
              <div className="pt-3 border-t border-slate-100">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600 leading-normal">
                    I agree to sign this document electronically and understand that my electronic signature is legally binding.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmitSignature}
                disabled={isSubmittingSignature || !signatureDataUrl || !consentChecked}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmittingSignature ? 'Stamping & Finalizing...' : 'Submit Signed Document'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdopt={handleAdoptSignature}
        defaultName={docInfo?.signerName || ''}
      />

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        AuthSign Secure Execution • Powered by tamper-evident cryptographic stamping
      </footer>
    </div>
  );
}
