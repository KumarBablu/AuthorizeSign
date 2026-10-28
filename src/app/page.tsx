import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileSignature, ShieldCheck, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-slate-800 py-4 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <FileSignature className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            Auth<span className="text-blue-500">Sign</span>
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/verify"
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Verify PDF
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 py-20 text-center space-y-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Internal Enterprise E-Signature Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Secure, Tamper-Evident <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            Digital Signatures
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          AuthSign delivers cryptographic PDF execution, multi-party sequential signing, email OTP authentication, and automated Certificate of Completion audit stamping.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            Go to Sender Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <Link
            href="/verify"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition-all"
          >
            Verify Executed PDF
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="p-6 bg-slate-800/50 border border-slate-800 rounded-2xl space-y-2">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Multi-Tenant Isolation</h3>
            <p className="text-xs text-slate-400">
              Row-Level Security across all organizations, documents, and audit logs.
            </p>
          </div>

          <div className="p-6 bg-slate-800/50 border border-slate-800 rounded-2xl space-y-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Mobile-First Signing</h3>
            <p className="text-xs text-slate-400">
              Zero login required for signatories. Two-factor email OTP and touch canvas signature capture.
            </p>
          </div>

          <div className="p-6 bg-slate-800/50 border border-slate-800 rounded-2xl space-y-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Aadhaar &amp; E-Stamp Ready</h3>
            <p className="text-xs text-slate-400">
              Pluggable provider architecture engineered to support Aadhaar eSign and legal e-stamping without code refactors.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        AuthSign • Secure Enterprise Electronic Signatures
      </footer>
    </div>
  );
}
