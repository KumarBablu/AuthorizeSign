'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileSearch,
  FileSignature,
  FileUp,
  Hash,
  Lock,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { computeSha256Hex } from '@/lib/pdf/hash';
import { validatePdfFile, validatePdfMagicBytes } from '@/lib/pdf/validator';

export default function VerifyPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualHash, setManualHash] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setVerificationResult(null);
    setIsProcessing(true);

    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file');
      setIsProcessing(false);
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const validMagic = validatePdfMagicBytes(arrayBuffer);
      if (!validMagic) {
        setErrorMessage('Invalid file: Document is missing valid %PDF- header magic bytes.');
        setIsProcessing(false);
        return;
      }

      const computedHash = await computeSha256Hex(arrayBuffer);

      // Call verification API
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha256: computedHash }),
      });

      const data = await res.json();
      setVerificationResult(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to verify file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualHashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualHash.trim()) return;

    setErrorMessage(null);
    setVerificationResult(null);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha256: manualHash.trim() }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <FileSignature className="w-4 h-4" />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">
              Auth<span className="text-blue-600">Sign</span>
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Sender Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Document Integrity Verification</h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Upload any executed PDF or enter its cryptographic SHA-256 checksum to verify its authenticity and ensure it has not been tampered with.
          </p>
        </div>

        {/* File Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50 scale-[1.01]'
              : 'border-slate-300 hover:border-slate-400 bg-white shadow-sm'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
              <FileUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Drop your signed PDF here, or click to browse
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Checksum computed client-side using WebCrypto SHA-256
              </p>
            </div>
          </div>
        </div>

        {/* Or enter SHA-256 hash manually */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Or Verify by SHA-256 Checksum
          </div>
          <form onSubmit={handleManualHashSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualHash}
              onChange={(e) => setManualHash(e.target.value)}
              placeholder="Paste 64-character SHA-256 hex digest..."
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={isProcessing || manualHash.length !== 64}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg disabled:opacity-50"
            >
              Verify
            </button>
          </form>
        </div>

        {isProcessing && (
          <div className="p-8 text-center text-slate-500 text-sm">
            Computing cryptographic digest and checking database...
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Verification Result Card */}
        {verificationResult && (
          <div className="animate-in fade-in duration-200">
            {verificationResult.verified ? (
              <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-md space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Verified Authentic Document
                    </h3>
                    <p className="text-xs text-emerald-700 font-medium">
                      Cryptographically matches original execution record
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Document Title:</span>
                    <span className="font-semibold text-slate-800">{verificationResult.title}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Execution Status:</span>
                    <span className="font-semibold text-emerald-700 uppercase">Completed</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Signed Timestamp:</span>
                    <span className="text-slate-700 font-mono">
                      {new Date(verificationResult.completedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Signed SHA-256 Hash:</span>
                    <span className="font-mono text-[11px] text-slate-700 break-all select-all block bg-white p-2 rounded border border-slate-200">
                      {verificationResult.sha256}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  Notice: In compliance with privacy standards, signer names and contact details are not exposed in public verification queries.
                </p>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border-2 border-amber-400 shadow-md space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 flex-shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      No Matching Record Found
                    </h3>
                    <p className="text-xs text-amber-700 font-medium">
                      Integrity check failed
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/50 rounded-xl text-xs text-slate-700 space-y-2">
                  <p>
                    The calculated SHA-256 checksum does not match any completed document in our records:
                  </p>
                  <span className="font-mono text-[11px] text-slate-800 break-all select-all block bg-white p-2 rounded border border-amber-200">
                    {verificationResult.sha256}
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    If this document was signed through AuthSign, even a single altered character, annotation, or modified byte will invalidate the SHA-256 checksum completely.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        AuthSign Cryptographic Verification Portal
      </footer>
    </div>
  );
}
