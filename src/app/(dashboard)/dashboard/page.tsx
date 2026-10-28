'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileSignature,
  FileText,
  PlusCircle,
  Search,
} from 'lucide-react';

interface DocumentSummary {
  id: string;
  title: string;
  status: 'draft' | 'pending' | 'completed' | 'expired';
  signing_order: 'sequential' | 'parallel';
  original_sha256: string;
  signed_sha256: string | null;
  expires_at: string;
  created_at: string;
  signers: Array<{
    id: string;
    name: string;
    email: string;
    status: 'pending' | 'signed' | 'declined';
  }>;
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const url = filterStatus === 'all' ? '/api/documents' : `/api/documents?status=${filterStatus}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [filterStatus]);

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Documents</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage, dispatch, and track digital signatures across your organization.
          </p>
        </div>

        <Link
          href="/documents/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Send New Document
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-1 w-full sm:w-auto">
          {['all', 'pending', 'completed', 'expired'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                filterStatus === status
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No documents found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by uploading a PDF and sending it for electronic signature.
            </p>
            <div className="mt-4">
              <Link
                href="/documents/new"
                className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
              >
                Upload document
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocs.map((doc) => {
              const signedCount = doc.signers.filter((s) => s.status === 'signed').length;
              const totalCount = doc.signers.length;

              return (
                <div
                  key={doc.id}
                  className="p-4 sm:px-6 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                      >
                        {doc.title}
                      </Link>

                      {/* Status Badges */}
                      {doc.status === 'completed' && (
                        <span className="inline-flex items-center text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          Completed
                        </span>
                      )}
                      {doc.status === 'pending' && (
                        <span className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3 mr-1 text-amber-600" />
                          Pending ({signedCount}/{totalCount})
                        </span>
                      )}
                      {doc.status === 'expired' && (
                        <span className="inline-flex items-center text-[10px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          <AlertCircle className="w-3 h-3 mr-1 text-red-600" />
                          Expired
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-slate-400">
                      <span>Order: {doc.signing_order}</span>
                      <span>•</span>
                      <span>Created: {new Date(doc.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Expires: {new Date(doc.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium rounded-lg"
                    >
                      Details &amp; Audit
                    </Link>

                    {doc.status === 'completed' && (
                      <a
                        href={`/api/documents/${doc.id}/download?type=signed`}
                        download
                        className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Signed PDF
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
