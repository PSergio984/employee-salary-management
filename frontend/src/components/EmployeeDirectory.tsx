import React, { useState } from 'react';
import { Employee } from '../types/employee.js';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Plus,
  Search,
  User,
  Users,
} from 'lucide-react';

interface EmployeeDirectoryProps {
  employees: Employee[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter: 'active' | 'archived' | 'all';
  onStatusFilterChange: (status: 'active' | 'archived' | 'all') => void;
  onPageChange: (page: number) => void;
  onOpenCreateModal: () => void;
  onSelectEmployee: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
  employees,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onPageChange,
  onOpenCreateModal,
  onSelectEmployee,
  onEditEmployee,
}) => {
  const [searchInput, setSearchInput] = useState(search);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput);
  };

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-indigo-400" />
            <span>Employee Directory</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Manage employee onboarding records, unique identification, and hire profiles.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span>Onboard Employee</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 sm:max-w-md"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by ID or name..."
            className="block w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2 pl-9 pr-20 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="absolute inset-y-1 right-1 rounded-md bg-slate-700 px-2.5 text-xs font-medium text-slate-200 hover:bg-slate-600"
          >
            Search
          </button>
        </form>

        {/* Status Filter Tabs */}
        <div className="flex rounded-lg border border-slate-800 bg-slate-950/80 p-1 text-xs font-medium">
          {(['active', 'archived', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onStatusFilterChange(tab)}
              className={`rounded-md px-3 py-1.5 capitalize transition ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Employee List Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-sm">Loading employees...</span>
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-3">
              <User className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No employees found</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              {search
                ? `No records matching "${search}". Try clearing your search filter.`
                : 'Get started by onboarding your first employee.'}
            </p>
            {search ? (
              <button
                onClick={() => {
                  setSearchInput('');
                  onSearchChange('');
                }}
                className="mt-4 text-xs font-semibold text-indigo-400 hover:underline"
              >
                Clear Search Filter
              </button>
            ) : (
              <button
                onClick={onOpenCreateModal}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Onboard Employee</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Employee ID
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Full Name
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Date Hired
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {employees.map((emp) => {
                  const fullName = [emp.firstName, emp.middleName, emp.lastName]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <tr
                      key={emp.id}
                      className="transition hover:bg-slate-800/40"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-slate-200">
                        {emp.employeeId}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-white">
                        {fullName}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                        {emp.dateHired}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                            emp.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {emp.isActive ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSelectEmployee(emp)}
                            className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                            title="View Employee Detail"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => onEditEmployee(emp)}
                            className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-950/60 hover:text-indigo-200"
                            title="Edit Employee Information"
                          >
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 20-Row Pagination Bar (Story 11 & Ticket 02) */}
        {!isLoading && total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 px-6 py-3.5 sm:flex-row text-xs text-slate-400">
            <div>
              Showing <strong className="text-white">{startRecord}</strong> to{' '}
              <strong className="text-white">{endRecord}</strong> of{' '}
              <strong className="text-white">{total}</strong> employees
            </div>

            <div className="flex items-center gap-2">
              <span className="mr-2">
                Page <strong className="text-white">{page}</strong> of{' '}
                <strong className="text-white">{totalPages}</strong>
              </span>

              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
