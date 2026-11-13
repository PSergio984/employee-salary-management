import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth.js';
import { Employee } from '../types/employee.js';
import {
  createEmployeeApi,
  getEmployeeByIdApi,
  getEmployeesApi,
  updateEmployeeApi,
} from '../api/employees.js';
import { EmployeeDirectory } from './EmployeeDirectory.js';
import { EmployeeDetail } from './EmployeeDetail.js';
import { EmployeeModal } from './EmployeeModal.js';
import {
  AlertTriangle,
  Clock,
  Layers,
  LogOut,
  User,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const { user, expiresAt, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // Employee Directory state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected Employee Detail state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getEmployeesApi({
        search,
        status: statusFilter,
        page,
        pageSize,
      });
      setEmployees(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    let isMounted = true;
    getEmployeesApi({
      search,
      status: statusFilter,
      page,
      pageSize,
    })
      .then((res) => {
        if (!isMounted) return;
        setEmployees(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch employees:', err);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, statusFilter, page, pageSize]);

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

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setEmployeeToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (savedEmployee: Employee) => {
    // Story 13: Newly created employees opened directly
    setSelectedEmployee(savedEmployee);
    void fetchEmployees();
  };

  const handleRefreshSelectedEmployee = async (id: number) => {
    try {
      const refreshed = await getEmployeeByIdApi(id);
      setSelectedEmployee(refreshed);
    } catch (err) {
      console.error('Failed to refresh employee details:', err);
    }
  };

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
                Ticket 03 • Basic Salary & Rates Active
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
        {selectedEmployee ? (
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
            onSearchChange={(newSearch) => {
              setSearch(newSearch);
              setPage(1);
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={(newStatus) => {
              setStatusFilter(newStatus);
              setPage(1);
            }}
            onPageChange={(newPage) => setPage(newPage)}
            onOpenCreateModal={handleOpenCreateModal}
            onSelectEmployee={(emp) => setSelectedEmployee(emp)}
            onEditEmployee={handleOpenEditModal}
          />
        )}
      </main>

      {/* Contextual Create/Edit Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
