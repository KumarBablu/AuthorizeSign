'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Mail,
  Send,
  Upload,
  User,
  Users,
} from 'lucide-react';

interface ParsedRecipient {
  name: string;
  email: string;
  isValid: boolean;
}

function BulkSendContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplateId = searchParams.get('templateId') || '';

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId);
  const [recipients, setRecipients] = useState<ParsedRecipient[]>([]);
  const [csvText, setCsvText] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  useEffect(() => {
    // Load templates
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data.templates || []);
        if (!selectedTemplateId && data.templates?.length > 0) {
          setSelectedTemplateId(data.templates[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const parseCsvContent = (content: string) => {
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    const parsed: ParsedRecipient[] = [];

    // Check if line 0 is a header (contains "email" or "name")
    let startIndex = 0;
    const headerLine = lines[0].toLowerCase();
    if (headerLine.includes('email') || headerLine.includes('name')) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Split by comma or tab
      const parts = line.split(/[,\t]/).map((p) => p.replace(/^["']|["']$/g, '').trim());

      let name = '';
      let email = '';

      if (parts.length >= 2) {
        // If second part looks like an email
        if (parts[1].includes('@')) {
          name = parts[0];
          email = parts[1];
        } else if (parts[0].includes('@')) {
          email = parts[0];
          name = parts[1];
        } else {
          name = parts[0];
          email = parts[1];
        }
      } else if (parts.length === 1 && parts[0].includes('@')) {
        email = parts[0];
        name = parts[0].split('@')[0];
      }

      if (email) {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        parsed.push({
          name: name || email.split('@')[0],
          email: email.toLowerCase(),
          isValid,
        });
      }
    }

    return parsed;
  };

  const handleFileUpload = (file: File) => {
    setIsProcessingFile(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        setCsvText(text);
        const parsed = parseCsvContent(text);
        if (parsed.length === 0) {
          setErrorMessage('No valid recipients found in file. Please ensure columns: Name, Email.');
        } else {
          setRecipients(parsed);
        }
      } catch (err: any) {
        setErrorMessage('Failed to read file: ' + err.message);
      } finally {
        setIsProcessingFile(false);
      }
    };
    reader.readAsText(file);
  };

  const handleManualTextChange = (text: string) => {
    setCsvText(text);
    const parsed = parseCsvContent(text);
    setRecipients(parsed);
  };

  const handleDispatch = async () => {
    if (!selectedTemplateId) {
      setErrorMessage('Please select a template');
      return;
    }

    const validRecipients = recipients.filter((r) => r.isValid);
    if (validRecipients.length === 0) {
      setErrorMessage('No valid recipients to dispatch to');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/templates/${selectedTemplateId}/bulk-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: validRecipients.map((r) => ({ name: r.name, email: r.email })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch bulk invitations');
      }

      setSuccessResult(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const validCount = recipients.filter((r) => r.isValid).length;
  const invalidCount = recipients.length - validCount;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/templates"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bulk Excel / CSV Dispatch</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribute legally binding electronic signature invitations to multiple signatories simultaneously.
            </p>
          </div>
        </div>
      </div>

      {successResult ? (
        <div className="bg-white rounded-2xl p-8 border border-emerald-200 shadow-md text-center space-y-5 animate-in fade-in duration-200">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">Campaign Dispatched Successfully!</h2>
            <p className="text-sm text-slate-600">
              Dispatched <strong>{successResult.totalDispatched}</strong> individualized documents with secure 32-byte signing tokens.
            </p>
          </div>

          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Each recipient has been sent an invitation email containing their single-use link. Real-time signatures will populate your overview dashboard.
          </p>

          <div className="pt-3 flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Go to Dashboard &rarr;
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccessResult(null);
                setRecipients([]);
                setCsvText('');
              }}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Send Another Batch
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Step 1: Select Template */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                <FileText className="w-4 h-4 mr-1.5 text-blue-600" />
                Step 1: Select Master Template
              </span>
              <Link href="/templates" className="text-xs text-blue-600 hover:underline">
                Manage Templates &rarr;
              </Link>
            </div>

            {templates.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                <span>No templates found. Please create a template first before launching bulk send.</span>
                <Link
                  href="/templates"
                  className="px-3 py-1 bg-amber-600 text-white rounded font-medium ml-2"
                >
                  Create Template
                </Link>
              </div>
            ) : (
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full py-2.5 px-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-800"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.templateName || t.title} ({t.fieldCount} fields configured)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2: Upload Excel / CSV */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-indigo-600" />
              Step 2: Upload Signatory List (Excel / CSV)
            </span>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50">
              <input
                type="file"
                accept=".csv, .txt, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="text-xs text-slate-400 mt-2">
                Accepted: CSV or text format with columns <strong>Name, Email</strong>
              </p>
            </div>

            {/* Manual Paste Accordion */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Or paste Comma-Separated Data (Name, Email):
              </label>
              <textarea
                rows={3}
                value={csvText}
                onChange={(e) => handleManualTextChange(e.target.value)}
                placeholder="John Doe, john@example.com&#10;Alice Smith, alice@example.com"
                className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Step 3: Recipient Validation Preview */}
          {recipients.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Parsed Recipients</h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                    <span className="text-emerald-700 font-semibold">{validCount} valid</span>
                    {invalidCount > 0 && <span className="text-red-600 font-semibold">• {invalidCount} invalid</span>}
                    <span>• {recipients.length} total rows</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDispatch}
                  disabled={isSending || validCount === 0 || !selectedTemplateId}
                  className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 hover:scale-[1.01]"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {isSending ? `Dispatching (${validCount})...` : `Dispatch ${validCount} Invitations`}
                </button>
              </div>

              {/* Table */}
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-semibold">#</th>
                      <th className="py-2 px-3 font-semibold">Recipient Name</th>
                      <th className="py-2 px-3 font-semibold">Email Address</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {recipients.map((r, idx) => (
                      <tr key={idx} className={r.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}>
                        <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-sans font-medium text-slate-900">{r.name}</td>
                        <td className="py-2 px-3 text-slate-700">{r.email}</td>
                        <td className="py-2 px-3 font-sans">
                          {r.isValid ? (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                              Valid
                            </span>
                          ) : (
                            <span className="text-[10px] text-red-700 font-semibold bg-red-100 px-2 py-0.5 rounded-full">
                              Invalid Email
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BulkSendPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading bulk dispatcher...</div>}>
      <BulkSendContent />
    </Suspense>
  );
}
