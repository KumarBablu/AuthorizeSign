'use client';

import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, FileUp, Hash, Layers, ShieldCheck } from 'lucide-react';
import { computeSha256Hex } from '@/lib/pdf/hash';
import { validatePdfFile, validatePdfMagicBytes } from '@/lib/pdf/validator';

export interface UploadedPdfMetadata {
  file: File;
  title: string;
  sha256: string;
  signingOrder: 'sequential' | 'parallel';
  expiryDays: number;
}

interface PdfUploaderProps {
  onUploaded: (metadata: UploadedPdfMetadata) => void;
}

export function PdfUploader({ onUploaded }: PdfUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [signingOrder, setSigningOrder] = useState<'sequential' | 'parallel'>('sequential');
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [sha256, setSha256] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (selectedFile: File) => {
    setError(null);
    setIsProcessing(true);

    const validation = validatePdfFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setIsProcessing(false);
      return;
    }

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const validMagic = validatePdfMagicBytes(arrayBuffer);
      if (!validMagic) {
        setError('Security check failed: File does not have valid %PDF- header magic bytes.');
        setIsProcessing(false);
        return;
      }

      const computedHash = await computeSha256Hex(arrayBuffer);
      setSha256(computedHash);
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.pdf$/i, ''));
      }
    } catch (err: any) {
      setError(`Failed to process PDF: ${err.message}`);
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

  const handleContinue = () => {
    if (!file || !sha256) return;
    onUploaded({
      file,
      title: title || file.name,
      sha256,
      signingOrder,
      expiryDays,
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400 bg-white'
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
            <FileUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-base font-medium text-slate-800">
              {file ? file.name : 'Click to upload or drag and drop your PDF'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports standard PDF documents up to 15 MB. Magic bytes (%PDF-) validated.
            </p>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center space-y-1 gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Config Form when file is validated */}
      {file && sha256 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Document Settings
            </span>
            <span className="inline-flex items-center text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Verified %PDF-
            </span>
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Services Agreement"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Signing Order */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Signing Order</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSigningOrder('sequential')}
                className={`flex items-start p-3 text-left border rounded-lg transition-all ${
                  signingOrder === 'sequential'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Layers className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">Sequential</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Signers sign in strict order (1 then 2)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSigningOrder('parallel')}
                className={`flex items-start p-3 text-left border rounded-lg transition-all ${
                  signingOrder === 'parallel'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">Parallel</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    All signers receive invitations simultaneously
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Expiry Days Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700 flex items-center">
                <Clock className="w-4 h-4 mr-1 text-slate-500" />
                Signing Link Expiration
              </label>
              <span className="text-xs font-semibold text-blue-600">{expiryDays} Days</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-1">
              After {expiryDays} days, uncompleted links expire with the notice: &quot;Time over, connect with organization.&quot;
            </p>
          </div>

          {/* SHA-256 fingerprint */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
            <div className="flex items-center text-xs font-medium text-slate-600 mb-1">
              <Hash className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Original Document SHA-256 Checksum
            </div>
            <div className="font-mono text-[11px] text-slate-700 break-all select-all">
              {sha256}
            </div>
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={isProcessing || !title.trim()}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            Continue to Add Signers &amp; Place Fields
          </button>
        </div>
      )}
    </div>
  );
}
