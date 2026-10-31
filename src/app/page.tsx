import Link from 'next/link';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Database,
  FileCheck,
  FileSignature,
  FileSpreadsheet,
  Globe2,
  Lock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 py-4 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white">
              Auth<span className="text-blue-500">Sign</span>
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] uppercase font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
              Enterprise eSign
            </span>
          </div>
        </div>

        <nav className="flex items-center space-x-3 sm:space-x-6">
          <Link
            href="/verify"
            className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors flex items-center"
          >
            <ShieldCheck className="w-4 h-4 mr-1 text-emerald-400" />
            Verify Document
          </Link>
          <Link
            href="/login"
            className="text-xs sm:text-sm text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-md shadow-blue-600/20 hover:scale-[1.02]"
          >
            Create Workspace &rarr;
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-20">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-medium text-blue-400">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Court-Admissible Legal Signatures • IT Act 2000, US ESIGN &amp; eIDAS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Enterprise Digital Execution with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300">
              Biometric &amp; GPS Non-Repudiation
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Scale your legal agreements, contracts, and workflows with cryptographic SHA-256 integrity, front-camera selfie verification, GPS geo-tagging, and Excel bulk dispatch.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-xl shadow-blue-600/30 hover:scale-[1.02]"
            >
              Access Sender Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              href="/verify"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700/80 transition-all hover:border-slate-600"
            >
              Verify Any Signed PDF
            </Link>
          </div>
        </div>

        {/* Dashboard Preview Graphic Card */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-xs text-slate-400 font-mono ml-2">authsign-enterprise-console</span>
            </div>
            <span className="text-xs text-emerald-400 font-medium flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2" />
              Live Cryptographic Anchor
            </span>
          </div>

          {/* Metric Cards Mockup */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800/60 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Created</span>
                <FileSignature className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-[11px] text-blue-400">Tamper-Evident SHA-256</div>
            </div>

            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800/60 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Signed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">Certified</div>
              <div className="text-[11px] text-emerald-400/80">With Certificate Page</div>
            </div>

            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800/60 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Pending</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400">Sequential</div>
              <div className="text-[11px] text-amber-400/80">Multi-Party Routing</div>
            </div>

            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800/60 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Audit Logs</span>
                <Database className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-400">Immutable</div>
              <div className="text-[11px] text-purple-400/80">Append-Only Postgres</div>
            </div>
          </div>

          {/* Activity Stream Teaser */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Live Audit Trail Feed
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-900 text-slate-300">
              <span className="flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                NDA Agreement executed • GPS (28.6139° N, 77.2090° E) + Selfie Stamped
              </span>
              <span className="text-slate-500 font-mono text-[11px]">Just now</span>
            </div>
            <div className="flex items-center justify-between py-1 text-slate-400">
              <span className="flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-2 text-blue-400" />
                Email OTP verified by signatory (IP: 103.21.244.2)
              </span>
              <span className="text-slate-500 font-mono text-[11px]">2 mins ago</span>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Engineered for Enterprise Legal Compliance
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Everything required to enforce electronic contracts, NDAs, and corporate agreements with absolute certainty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Biometric Selfie &amp; GPS Audit</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Capture the signer&apos;s static front-camera photo and browser GPS location coordinates. Both are stamped onto the official Certificate of Completion.
              </p>
            </div>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Templates &amp; Bulk Excel Dispatch</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Create reusable document templates with pre-placed fields. Upload an Excel or CSV file to send hundreds of personalized invitations simultaneously.
              </p>
            </div>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Admin RBAC Team Controls</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add, update, or remove organization members. Role-based permissions (Owner, Admin, Sender, Viewer) ensure strict administrative governance.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 px-6 text-center text-xs text-slate-500 space-y-2 bg-slate-950">
        <div className="flex items-center justify-center space-x-6 text-slate-400">
          <Link href="/verify" className="hover:text-white">Public Verification</Link>
          <Link href="/login" className="hover:text-white">Workspace Sign In</Link>
          <Link href="/dashboard" className="hover:text-white">Console</Link>
        </div>
        <p>AuthSign Enterprise Platform • Section 65B Electronic Certificate Compliant</p>
      </footer>
    </div>
  );
}
