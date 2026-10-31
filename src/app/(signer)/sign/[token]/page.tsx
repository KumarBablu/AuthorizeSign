'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  CheckCircle2,
  Clock,
  Download,
  FileSignature,
  Lock,
  Mail,
  MapPin,
  PenTool,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { SignatureModal } from '@/components/signer/signature-modal';

type SignerState =
  | 'loading'
  | 'ready_to_verify'
  | 'ready_to_sign'
  | 'blocked'
  | 'already_signed_by_you'
  | 'expired'
  | 'completed';

export default function SignerTokenPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<SignerState>('loading');
  const [docInfo, setDocInfo] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP flow state
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSentNotice, setOtpSentNotice] = useState(false);

  // Signature state
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<'draw' | 'typed'>('draw');
  const [typedFont, setTypedFont] = useState<string | undefined>(undefined);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);

  // Biometric Photo state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // GPS Geo-location state
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isFetchingGeo, setIsFetchingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Fetch token status on load
  const fetchTokenStatus = async () => {
    setState('loading');
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/sign/${token}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load document');
      }

      setDocInfo(data);
      setState(data.state);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading document');
    }
  };

  useEffect(() => {
    if (token) {
      fetchTokenStatus();
    }
  }, [token]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

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
      // Proactively request GPS location
      requestGeoLocation();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Camera Activation
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setErrorMessage(
        'Camera permission was denied or camera is unavailable. You can still sign, but taking a verification photo ensures full court-admissible audit proof.'
      );
    }
  };

  // Attach stream to video ref when camera becomes active
  useEffect(() => {
    if (isCameraActive && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(console.error);
    }
  }, [isCameraActive, cameraStream]);

  // Handle Capture Photo with 3-Second Countdown
  const triggerPhotoCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          takeSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw frame to canvas
      ctx.drawImage(videoRef.current, 0, 0, 400, 300);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoDataUrl(dataUrl);

      // Stop camera stream
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
      setIsCameraActive(false);
    }
  };

  // Handle GPS Geo-Location Request
  const requestGeoLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsFetchingGeo(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsFetchingGeo(false);
      },
      (err) => {
        setGeoError(err.message || 'Unable to retrieve location');
        setIsFetchingGeo(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
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
      setErrorMessage('Please create or adopt your signature first.');
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
          signerPhotoBase64: photoDataUrl || undefined,
          geoLocation: geoLocation || undefined,
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

        {/* STATE 1: COMPLETED */}
        {state === 'completed' && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md text-center space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">Document has been signed</h2>
              <p className="text-sm text-slate-500">
                &quot;{docInfo?.title || 'Document'}&quot; has been fully signed and executed.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-700">Cryptographically Certified</div>
              <p className="text-[11px] text-slate-500">
                A formal Certificate of Completion with biometric identity proof, GPS coordinates, and tamper-evident SHA-256 checksums has been anchored to this record.
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

        {/* STATE 2: EXPIRED */}
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

        {/* STATE 3: THIS SIGNER ALREADY SIGNED */}
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

        {/* STATE 6: READY TO SIGN (PDF Review + Biometric Photo + GPS + Signature) */}
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

              {/* Legal Biometric Photo Verification Step */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center">
                    <Camera className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Biometric Identity Verification
                  </span>
                  {photoDataUrl && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Photo Verified
                    </span>
                  )}
                </div>

                {!photoDataUrl ? (
                  <div>
                    {!isCameraActive ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full py-2.5 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center justify-center space-x-2 transition-all shadow-sm"
                      >
                        <Camera className="w-4 h-4 text-blue-600" />
                        <span>Allow Front Camera &amp; Take Verification Selfie</span>
                      </button>
                    ) : (
                      <div className="space-y-3 text-center">
                        <div className="relative w-full max-w-[280px] mx-auto rounded-xl overflow-hidden border border-slate-300 bg-black aspect-video flex items-center justify-center">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          {countdown !== null && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-5xl font-extrabold text-white animate-pulse">
                                {countdown}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={triggerPhotoCountdown}
                            disabled={countdown !== null}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm flex items-center space-x-1"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Capture Selfie (3s Timer)</span>
                          </button>
                          <button
                            type="button"
                            onClick={takeSnapshot}
                            disabled={countdown !== null}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-xs rounded-lg"
                          >
                            Snap Now
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                      Your photo will be securely embedded into the formal Certificate of Completion to guarantee legal non-repudiation.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <img
                        src={photoDataUrl}
                        alt="Signer Selfie"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">
                          Front-Camera Selfie Captured
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Anchored to Certificate of Completion
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoDataUrl(null);
                        startCamera();
                      }}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Retake
                    </button>
                  </div>
                )}
              </div>

              {/* GPS Geo-Location Verification Step */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Geographical Location Audit Tag
                  </span>
                  {geoLocation && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ GPS Verified
                    </span>
                  )}
                </div>

                {geoLocation ? (
                  <div className="text-xs text-slate-700 font-mono bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                    <span>
                      {geoLocation.lat.toFixed(4)}° N, {geoLocation.lng.toFixed(4)}° E (±{Math.round(geoLocation.accuracy || 10)}m)
                    </span>
                    <button
                      type="button"
                      onClick={requestGeoLocation}
                      className="text-[10px] text-blue-600 hover:underline font-sans"
                    >
                      Refresh
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {isFetchingGeo ? 'Acquiring GPS location...' : geoError ? geoError : 'Location not recorded'}
                    </span>
                    <button
                      type="button"
                      onClick={requestGeoLocation}
                      disabled={isFetchingGeo}
                      className="text-xs text-blue-600 hover:underline font-medium flex items-center"
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${isFetchingGeo ? 'animate-spin' : ''}`} />
                      {isFetchingGeo ? 'Detecting...' : 'Detect GPS'}
                    </button>
                  </div>
                )}
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
                    I agree to sign this document electronically and understand that my electronic signature and recorded audit metrics are legally binding under applicable electronic signature laws.
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
                {isSubmittingSignature ? 'Stamping & Finalizing Certificate...' : 'Submit Signed Document'}
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
