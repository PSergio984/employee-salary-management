import React, { useState } from 'react';
import { useAuth } from '../context/useAuth.js';
import { useEmployeesViewModel } from '../viewmodels/useEmployeesViewModel.js';
import { createEmployeeApi, updateEmployeeApi } from '../api/employees.js';
import { EmployeeDirectory } from './EmployeeDirectory.js';
import { EmployeeDetail } from './EmployeeDetail.js';
import { EmployeeModal } from './EmployeeModal.js';
import { ComponentCatalog } from './ComponentCatalog/ComponentCatalog.js';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Layers,
  Lock,
  LogOut,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const { user, expiresAt, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'employees' | 'catalog' | 'overview'>('employees');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const {
    employees,
    total,
    page,
    pageSize,
    totalPages,
    search,
    statusFilter,
    isLoading,
    selectedEmployee,
    setSelectedEmployee,
    isModalOpen,
    employeeToEdit,
    fetchEmployees,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
    handleModalSuccess,
    handleRefreshSelectedEmployee,
    handleSearchChange,
    handleStatusFilterChange,
    setPage,
  } = useEmployeesViewModel();

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
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-base">
                Employee Salary Management
              </span>
              <span className="ml-2.5 rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                Ticket 03 & 04 • Integrated
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

      {/* Main Navigation Tabs */}
      <nav aria-label="Main Navigation" className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto flex max-w-7xl gap-6 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition ${
              activeTab === 'employees'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4 text-indigo-400" />
            <span>Employees</span>
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition ${
              activeTab === 'catalog'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4 text-indigo-400" />
            <span>Salary Components</span>
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span>Overview & Safeguards</span>
          </button>
        </div>
      </nav>

      {/* Logout error banner */}
      {logoutError && (
        <div className="border-b border-red-900/50 bg-red-950/60 px-4 py-3 text-center text-sm text-red-200 flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{logoutError}</span>
          <button
            onClick={() => setLogoutError(null)}
            className="ml-3 text-xs underline text-red-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'employees' && (
          selectedEmployee ? (
            <EmployeeDetail
              employee={selectedEmployee}
              onBack={() => {
                setSelectedEmployee(null);
                void fetchEmployees();
              }}
              onEdit={handleOpenEditModal}
              onEmployeeUpdated={(updated) => setSelectedEmployee(updated)}
            />
          ) : (
            <EmployeeDirectory
              employees={employees}
              total={total}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              isLoading={isLoading}
              search={search}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              onPageChange={(newPage) => setPage(newPage)}
              onOpenCreateModal={handleOpenCreateModal}
              onSelectEmployee={(emp) => setSelectedEmployee(emp)}
              onEditEmployee={handleOpenEditModal}
            />
          )
        )}

        {activeTab === 'catalog' && <ComponentCatalog />}

        {activeTab === 'overview' && (
          <div className="space-y-8">
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
                    <span>SHA-256 token hash indexing (constant-time lookup)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Double-submit CSRF cookie + origin validation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>No-cache, no-store headers on sensitive APIs</span>
                  </li>
                </ul>
              </div>

              {/* Architecture & Invariants */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Architecture Invariants</h2>
                    <p className="text-xs text-slate-400">Neon Postgres & Prisma</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs font-mono bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 mb-3">
                  <div className="text-slate-400">Database Project:</div>
                  <div className="text-indigo-400 font-semibold truncate">employee-salary-management</div>
                  <div className="mt-2 text-slate-400">Active Branch:</div>
                  <div className="text-emerald-400 font-semibold">development (isolated)</div>
                  <div className="mt-2 text-slate-400">Prisma Client/Adapter:</div>
                  <div className="text-slate-200">7.10.1 (Pinned)</div>
                </div>
                <p className="text-xs text-slate-400">
                  Repeat-safe seed verified. Test suite executes independently against isolated Neon test branch.
                </p>
              </div>

              {/* Modules Roadmap */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm md:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Modules Progress</h2>
                    <p className="text-xs text-slate-400">Baseline breakdown</p>
                  </div>
                </div>
                <ol className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center justify-between p-2 rounded bg-emerald-950/30 border border-emerald-800/40 text-emerald-300">
                    <span className="font-medium">01. Standalone Sign-In</span>
                    <span className="text-emerald-400 font-semibold">Complete</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded bg-emerald-950/30 border border-emerald-800/40 text-emerald-300">
                    <span className="font-medium text-emerald-300">02. Employee Onboarding</span>
                    <span className="text-emerald-400 font-semibold">Complete</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded bg-emerald-950/30 border border-emerald-800/40 text-emerald-300">
                    <span className="font-medium text-emerald-300">03. Basic Salary & History</span>
                    <span className="text-emerald-400 font-semibold">Complete</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded bg-emerald-950/30 border border-emerald-800/40 text-emerald-300">
                    <span className="font-medium text-emerald-300">04. Shared Component Catalog</span>
                    <span className="text-emerald-400 font-semibold">Complete</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded bg-slate-800/20 text-slate-400">
                    <span>05. Employee Components & Rates</span>
                    <span className="text-slate-600">Pending</span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Milestone Card */}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/10 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-indigo-300">
                    Vertical Slices 01–04 Integrated
                  </h3>
                  <p className="mt-1 text-sm text-slate-300 leading-relaxed">
                    Authentication, Employee Onboarding with versioned optimistic concurrency, Basic Salary Assignment with retained immutable history & Philippine statutory labor rate formulas, and the Shared Salary Component Catalog are unified under a single architecture.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Contextual Create/Edit Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmitCreate={createEmployeeApi}
        onSubmitEdit={updateEmployeeApi}
        employeeToEdit={employeeToEdit}
        onSuccess={(saved) => {
          handleModalSuccess(saved);
          if (selectedEmployee && selectedEmployee.id === saved.id) {
            void handleRefreshSelectedEmployee(saved.id);
          }
        }}
      />
    </div>
  );
};
