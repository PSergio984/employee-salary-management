import React, { useState } from 'react';
import { useAuth } from '../context/useAuth.js';
import {
  LogOut,
  ShieldCheck,
  User,
  Clock,
  Database,
  CheckCircle2,
  Lock,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const { user, expiresAt, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to revoke session on server. You remain signed in. Please retry.';
      setLogoutError(msg);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleTimeString('en-PH', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '8 hours';

  const formattedExpiryDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-base">
                Employee Salary Management
              </span>
              <span className="ml-2.5 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                Ticket 01 • Sign-in Ready
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 border border-slate-700/50">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>
                Session expires at <strong className="text-white">{formattedExpiry}</strong> ({formattedExpiryDate})
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200 border border-slate-700">
              <User className="h-4 w-4 text-indigo-400" />
              <span className="font-medium text-white">{user?.username}</span>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-red-950/40 hover:text-red-300 hover:border-red-800/60 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-50"
              title="Log out and revoke session"
            >
              <LogOut className="h-4 w-4" />
              <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Logout failure alert banner */}
      {logoutError && (
        <div
          role="alert"
          className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-950/60 p-4 text-sm text-red-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <span>{logoutError}</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded bg-red-800/80 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              Retry Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Active Security Safeguards */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Security Safeguards</h2>
                <p className="text-xs text-slate-400">OWASP compliance active</p>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>32-byte CSPRNG verifier in HttpOnly cookie</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>SHA-256 verifier hash stored in database</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Fixed 8-hour expiry (no sliding extension)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Strict CSRF header & origin verification</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Immediate database-backed logout revocation</span>
              </li>
            </ul>
          </div>

          {/* Database Target Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Neon PostgreSQL</h2>
                <p className="text-xs text-slate-400">Singapore (aws-ap-southeast-1)</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800/80 font-mono text-xs">
                <div className="text-slate-400">Project:</div>
                <div className="text-indigo-300 font-semibold truncate">employee-salary-management</div>
                <div className="mt-2 text-slate-400">Active Branch:</div>
                <div className="text-emerald-400 font-semibold">development (isolated)</div>
                <div className="mt-2 text-slate-400">Prisma Client/Adapter:</div>
                <div className="text-slate-200">7.10.1 (Pinned)</div>
              </div>
              <p className="text-xs text-slate-400">
                Repeat-safe seed verified. Test suite executes independently against isolated Neon test branch.
              </p>
            </div>
          </div>

          {/* Next Slices Roadmap */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Upcoming Modules</h2>
                <p className="text-xs text-slate-400">Ready for subsequent tickets</p>
              </div>
            </div>
            <ol className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center justify-between p-2 rounded bg-slate-800/40 border border-slate-800">
                <span className="font-medium text-slate-200">02. Employee Onboarding</span>
                <span className="text-slate-500">Next</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded bg-slate-800/20 text-slate-400">
                <span>03. Basic Salary & History</span>
                <span className="text-slate-600">Pending</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded bg-slate-800/20 text-slate-400">
                <span>04. Component Catalog</span>
                <span className="text-slate-600">Pending</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded bg-slate-800/20 text-slate-400">
                <span>05. Employee Components & Rates</span>
                <span className="text-slate-600">Pending</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Milestone Card */}
        <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-emerald-300">
                Vertical Slice 01 Complete: Standalone Sign-In
              </h3>
              <p className="mt-1 text-sm text-slate-300 leading-relaxed">
                The standalone React/NestJS architecture is established with Prisma 7.10.1 and connected to the dedicated Singapore Neon database. The administrator account signs in securely, survives browser page refresh, rejects cross-origin tampering, and revokes immediately upon logout.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-emerald-400">
                <span className="rounded bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20">
                  Prisma 7.10.1
                </span>
                <span className="rounded bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20">
                  NestJS 12 + Express
                </span>
                <span className="rounded bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20">
                  Vite Proxy /api
                </span>
                <span className="rounded bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20">
                  HttpOnly Sessions
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
