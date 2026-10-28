'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  Hash,
  Mail,
  ShieldAlert,
  User,
} from 'lucide-react';

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.id as string;

  const [document, setDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocument() {
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (!res.ok) {
          throw new Error('Failed to load document');
        }
        const data = await res.json();
        setDocument(data.document);
      } catch (err: any) {
        setError(err.message || 'Error loading document');
      } finally {
        setIsLoading(false);
      }
    }
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-500 text-sm">
        Loading document details...
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-red-600 space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto" />
        <p className="text-sm font-medium">{error || 'Document not found'}</p>
        <Link href="/dashboard" className="inline-block text-xs text-blue-600 hover:underline">
          Return to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Documents
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{document.title}</h1>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={`/api/documents/${document.id}/download?type=original`}
            download
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Original PDF
          </a>

          {document.status === 'completed' && (
            <a
              href={`/api/documents/${document.id}/download?type=signed`}
              download
              className="inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm"
            >
              <FileCheck className="w-3.5 h-3.5 mr-1.5" />
              Signed PDF &amp; Certificate
            </a>
          )}
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-sm">
          <div className="text-xs text-slate-500">Current Status</div>
          <div className="flex items-center space-x-1.5">
            {document.status === 'completed' && (
              <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Completed
              </span>
            )}
            {document.status === 'pending' && (
              <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Pending Signatures
              </span>
            )}
            {document.status === 'expired' && (
              <span className="inline-flex items-center text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
                Expired
              </span>
            )}
            {document.status === 'draft' && (
              <span className="inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                Draft
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-sm">
          <div className="text-xs text-slate-500">Signing Order &amp; Expiry</div>
          <div className="text-xs font-medium text-slate-800 capitalize">
            {document.signing_order} Order • Expires {new Date(document.expires_at).toLocaleDateString()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-sm">
          <div className="text-xs text-slate-500">Verification &amp; Signature Mode</div>
          <div className="text-xs font-medium text-slate-800 uppercase">
            {document.verification_method} • {document.signature_method}
          </div>
        </div>
      </div>

      {/* Cryptographic Hash Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center text-xs font-semibold text-slate-700">
          <Hash className="w-4 h-4 mr-1 text-blue-600" />
          Cryptographic Integrity Checksums
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block mb-0.5">Original SHA-256 Digest:</span>
            <span className="font-mono text-[11px] text-slate-800 break-all select-all">
              {document.original_sha256}
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block mb-0.5">Signed SHA-256 Digest:</span>
            <span className="font-mono text-[11px] text-slate-800 break-all select-all">
              {document.signed_sha256 || 'Pending final completion'}
            </span>
          </div>
        </div>
      </div>

      {/* Signatories Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Signatories</h2>
          <span className="text-xs text-slate-500">
            {document.signers?.length || 0} Total Signers
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {document.signers?.map((signer: any) => (
            <div
              key={signer.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">
                  {signer.order_index + 1}
                </div>
                <div>
                  <div className="font-medium text-slate-900">{signer.name}</div>
                  <div className="text-slate-500">{signer.email}</div>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-slate-500">
                <div>
                  <span className="text-slate-400 block">OTP Verified:</span>
                  <span>{signer.verified_at ? new Date(signer.verified_at).toLocaleTimeString() : 'Not yet'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Signed:</span>
                  <span>{signer.signed_at ? new Date(signer.signed_at).toLocaleDateString() : 'Pending'}</span>
                </div>
                <div>
                  {signer.status === 'signed' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                      Signed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Append-Only Audit Trail</h2>
          <p className="text-xs text-slate-500">
            Cryptographically recorded immutable events (DB triggers forbid modification or deletion).
          </p>
        </div>

        <div className="p-4 space-y-3">
          {document.audit_events?.map((event: any) => (
            <div key={event.id} className="flex items-start space-x-3 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                    {event.event_type.replace('_', ' ')}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
                {event.ip_address && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    IP: {event.ip_address} • Agent: {event.user_agent ? event.user_agent.slice(0, 45) + '...' : 'Unknown'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
