'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Mail,
  MapPin,
  PlusCircle,
  Search,
  ShieldCheck,
  UserCheck,
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

interface ActivityEvent {
  id: string;
  eventType: string;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
  documentTitle: string;
  signerName: string | null;
  signerEmail: string | null;
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [counts, setCounts] = useState({ created: 0, signed: 0, pending: 0, expired: 0 });
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [orgInfo, setOrgInfo] = useState<{ name: string; role: string }>({ name: '', role: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Stats & Activity Logs
      const statsRes = await fetch('/api/dashboard/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setCounts(statsData.counts || { created: 0, signed: 0, pending: 0, expired: 0 });
        setActivities(statsData.recentActivity || []);
        setOrgInfo({ name: statsData.organizationName || '', role: statsData.userRole || '' });
      }

      // 2. Fetch Documents
      const docsUrl = filterStatus === 'all' ? '/api/documents' : `/api/documents?status=${filterStatus}`;
      const docsRes = await fetch(docsUrl);
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.documents || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterStatus]);

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderEventIcon = (type: string) => {
    switch (type) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'signed':
        return <FileSignature className="w-4 h-4 text-blue-500" />;
      case 'otp_verified':
        return <ShieldCheck className="w-4 h-4 text-teal-500" />;
      case 'otp_sent':
        return <Mail className="w-4 h-4 text-amber-500" />;
      case 'document_sent':
        return <Activity className="w-4 h-4 text-indigo-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview Dashboard</h1>
            {orgInfo.role && (
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-full">
                {orgInfo.role}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Workspace: <strong>{orgInfo.name || 'Enterprise Workspace'}</strong> • Cryptographic Audit Status Active
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/templates/bulk"
            className="inline-flex items-center px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-indigo-400" />
            Bulk Excel Send
          </Link>
          <Link
            href="/documents/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Send New Document
          </Link>
        </div>
      </div>

      {/* OVERALL METRICS CARDS (Created, Signed, Pending, Expired) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Created Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Created Documents</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{counts.created}</div>
          <p className="text-[11px] text-slate-400">Total documents uploaded</p>
        </div>

        {/* Signed / Completed Card */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
            <span>Signed / Completed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-700">{counts.signed}</div>
          <p className="text-[11px] text-emerald-600/80">Certified execution records</p>
        </div>

        {/* Pending Card */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-amber-700">
            <span>Pending Signatures</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-700">{counts.pending}</div>
          <p className="text-[11px] text-amber-600/80">Awaiting signatory completion</p>
        </div>

        {/* Expired Card */}
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-red-700">
            <span>Expired Documents</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-red-700">{counts.expired}</div>
          <p className="text-[11px] text-red-600/80">Past deadline threshold</p>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: Documents on Left, Real-Time Activity Logs on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Documents List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
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
                      ? 'bg-slate-900 text-white font-semibold'
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
                placeholder="Search documents..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading documents...</div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">No documents found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Upload a PDF agreement or dispatch a bulk campaign from your templates.
                </p>
                <div className="pt-2">
                  <Link
                    href="/documents/new"
                    className="inline-flex items-center px-3.5 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                  >
                    Upload first document
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
                      className="p-4 sm:px-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2.5">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            {doc.title}
                          </Link>

                          {doc.status === 'completed' && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Completed
                            </span>
                          )}
                          {doc.status === 'pending' && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3 mr-1 text-amber-600" />
                              Pending ({signedCount}/{totalCount})
                            </span>
                          )}
                          {doc.status === 'expired' && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              <AlertCircle className="w-3 h-3 mr-1 text-red-600" />
                              Expired
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-3 text-xs text-slate-400">
                          <span>Order: <strong className="text-slate-600 capitalize">{doc.signing_order}</strong></span>
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
                          Audit &amp; Details
                        </Link>

                        {doc.status === 'completed' && (
                          <a
                            href={`/api/documents/${doc.id}/download?type=signed`}
                            download
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            PDF
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

        {/* Right Column: Real-Time Activity Logs Feed (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Activity Logs &amp; Audit Feed</h2>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
              Live Feed
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="space-y-3.5">
              {activities.slice(0, 10).map((act) => (
                <div key={act.id} className="flex items-start space-x-2.5 text-xs">
                  <div className="mt-0.5 p-1 bg-slate-50 border border-slate-200 rounded-md flex-shrink-0">
                    {renderEventIcon(act.eventType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 leading-snug">
                      <strong className="font-semibold text-slate-900 capitalize">
                        {act.eventType.replace(/_/g, ' ')}
                      </strong>{' '}
                      on{' '}
                      <span className="text-blue-600 truncate inline-block max-w-[150px] align-bottom">
                        {act.documentTitle}
                      </span>
                    </p>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {act.signerName && <span>• by {act.signerName}</span>}
                      {act.ipAddress && <span>• IP: {act.ipAddress}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              Append-only immutable audit trail • Tamper-proof
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
