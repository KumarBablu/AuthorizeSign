'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Send, Users, FileText, Move } from 'lucide-react';
import { FieldEditor, type DocumentField } from '@/components/document/field-editor';
import { PdfUploader, type UploadedPdfMetadata } from '@/components/document/pdf-uploader';
import { SignerManager, type SignerItem, SIGNER_COLORS } from '@/components/document/signer-manager';

export default function NewDocumentPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Document metadata from Step 1
  const [docMeta, setDocMeta] = useState<UploadedPdfMetadata | null>(null);

  // Signers from Step 2
  const [signers, setSigners] = useState<SignerItem[]>([
    {
      tempId: 'signer_1',
      name: '',
      email: '',
      orderIndex: 0,
      color: SIGNER_COLORS[0].hex,
    },
  ]);

  // Fields from Step 3
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePdfUploaded = (meta: UploadedPdfMetadata) => {
    setDocMeta(meta);
    setStep(2);
  };

  const handleSendForSignature = async () => {
    if (!docMeta) return;
    setErrorMessage(null);

    // Validate that every signatory has at least one signature field placed
    for (let i = 0; i < signers.length; i++) {
      const s = signers[i];
      const hasSig = fields.some((f) => f.signerTempId === s.tempId && f.type === 'signature');
      if (!hasSig) {
        setErrorMessage(`Please place at least one Signature box for ${s.name || `Signatory ${i + 1}`} before sending.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Upload Document via API
      const formData = new FormData();
      formData.append('file', docMeta.file);
      formData.append('title', docMeta.title);
      formData.append('signingOrder', docMeta.signingOrder);
      formData.append('expiryDays', String(docMeta.expiryDays));

      const uploadRes = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload document');
      }

      const documentId = uploadData.documentId;

      // 2. Save Signers
      const validSigners = signers.filter((s) => s.email && s.name);
      const signersRes = await fetch(`/api/documents/${documentId}/signers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signers: validSigners.map((s) => ({
            name: s.name.trim(),
            email: s.email.trim().toLowerCase(),
            orderIndex: s.orderIndex,
          })),
        }),
      });

      const signersData = await signersRes.json();
      if (!signersRes.ok) {
        throw new Error(signersData.error || 'Failed to save signers');
      }

      // Map temporary signer IDs to saved database signer IDs
      const savedSigners: Array<{ id: string; email: string }> = signersData.signers;
      const signerIdMap = new Map<string, string>();
      for (const s of validSigners) {
        const found = savedSigners.find((saved) => saved.email.toLowerCase() === s.email.toLowerCase());
        if (found) {
          signerIdMap.set(s.tempId, found.id);
        }
      }

      // 3. Save Fields
      const mappedFields = fields
        .filter((f) => signerIdMap.has(f.signerTempId))
        .map((f) => ({
          signerId: signerIdMap.get(f.signerTempId)!,
          type: f.type,
          page: f.page,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
        }));

      if (mappedFields.length > 0) {
        const fieldsRes = await fetch(`/api/documents/${documentId}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: mappedFields }),
        });

        const fieldsData = await fieldsRes.json();
        if (!fieldsRes.ok) {
          throw new Error(fieldsData.error || 'Failed to save fields');
        }
      }

      // 4. Send Document
      const sendRes = await fetch(`/api/documents/${documentId}/send`, {
        method: 'POST',
      });
      const sendData = await sendRes.json();
      if (!sendRes.ok) {
        throw new Error(sendData.error || 'Failed to dispatch document');
      }

      // Redirect to dashboard
      router.push(`/documents/${documentId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-8 pb-4 border-b border-slate-200">
        <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            1
          </span>
          <span className="text-sm">Upload &amp; Details</span>
        </div>

        <div className="w-12 h-0.5 bg-slate-200" />

        <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            2
          </span>
          <span className="text-sm">Add Signers</span>
        </div>

        <div className="w-12 h-0.5 bg-slate-200" />

        <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            3
          </span>
          <span className="text-sm">Place Fields</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && <PdfUploader onUploaded={handlePdfUploaded} />}

      {/* Step 2: Add Signers */}
      {step === 2 && docMeta && (
        <div className="max-w-2xl mx-auto space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Configure Signatories</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mode: {docMeta.signingOrder === 'sequential' ? 'Sequential (Ordered)' : 'Parallel (Simultaneous)'} • Expiry: {docMeta.expiryDays} days
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Change file
            </button>
          </div>

          <SignerManager
            signers={signers}
            onChange={setSigners}
            isSequential={docMeta.signingOrder === 'sequential'}
          />

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                if (signers.length === 0) {
                  setErrorMessage('Please add at least one signatory.');
                  return;
                }
                for (let i = 0; i < signers.length; i++) {
                  const s = signers[i];
                  if (!s.name.trim()) {
                    setErrorMessage(`Please enter a full name for Signatory ${i + 1}.`);
                    return;
                  }
                  if (!s.email.trim() || !s.email.includes('@') || !s.email.includes('.')) {
                    setErrorMessage(`Please enter a valid email address for Signatory ${i + 1} (${s.name || 'unnamed'}).`);
                    return;
                  }
                }
                const emails = signers.map((s) => s.email.trim().toLowerCase());
                if (new Set(emails).size !== emails.length) {
                  setErrorMessage('Each signatory must have a unique email address.');
                  return;
                }
                setStep(3);
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              Next: Place Fields
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Drag & Drop Field Placement */}
      {step === 3 && docMeta && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{docMeta.title}</h2>
              <p className="text-xs text-slate-500">
                Click anywhere to drop fields. Click and drag any placed field to freely adjust its coordinates.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
              >
                Back to Signers
              </button>

              <button
                type="button"
                onClick={handleSendForSignature}
                disabled={isSubmitting || fields.length === 0}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {isSubmitting ? 'Sending...' : 'Send for signature'}
              </button>
            </div>
          </div>

          <FieldEditor
            totalPages={1}
            signers={signers}
            fields={fields}
            onChange={setFields}
          />
        </div>
      )}
    </div>
  );
}
