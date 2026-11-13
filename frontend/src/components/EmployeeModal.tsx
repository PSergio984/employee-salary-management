import React from 'react';
import { CreateEmployeePayload, Employee } from '../types/employee.js';
import { useEmployeeModalViewModel } from '../viewmodels/useEmployeeModalViewModel.js';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreate?: (payload: CreateEmployeePayload) => Promise<Employee>;
  onSubmitEdit?: (
    id: number,
    payload: {
      expectedVersion: number;
      employeeId?: string;
      firstName?: string;
      middleName?: string | null;
      lastName?: string;
      dateHired?: string;
    },
  ) => Promise<Employee>;
  employeeToEdit?: Employee | null;
  onSuccess: (employee: Employee) => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
  employeeToEdit,
  onSuccess,
}) => {
  const {
    isEditing,
    todayInManila,
    employeeId,
    setEmployeeId,
    firstName,
    setFirstName,
    middleName,
    setMiddleName,
    lastName,
    setLastName,
    dateHired,
    setDateHired,
    isSubmitting,
    errorMessage,
    handleSubmit,
  } = useEmployeeModalViewModel({
    employeeToEdit,
    onSubmitCreate,
    onSubmitEdit,
    onSuccess,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Employee Record' : 'Onboard New Employee'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="employee-id"
              className="block text-xs font-medium text-slate-300"
            >
              Employee ID <span className="text-red-400">*</span>
            </label>
            <input
              id="employee-id"
              type="text"
              required
              disabled={isSubmitting}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. EMP-2026-0001"
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Must be unique across all active and archived employees.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="first-name"
                className="block text-xs font-medium text-slate-300"
              >
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                id="first-name"
                type="text"
                required
                disabled={isSubmitting}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="middle-name"
                className="block text-xs font-medium text-slate-300"
              >
                Middle Name <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                id="middle-name"
                type="text"
                disabled={isSubmitting}
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Protacio"
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="last-name"
              className="block text-xs font-medium text-slate-300"
            >
              Last Name <span className="text-red-400">*</span>
            </label>
            <input
              id="last-name"
              type="text"
              required
              disabled={isSubmitting}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Dela Cruz"
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="date-hired"
              className="block text-xs font-medium text-slate-300"
            >
              Date Hired <span className="text-red-400">*</span>
            </label>
            <input
              id="date-hired"
              type="date"
              required
              max={todayInManila}
              disabled={isSubmitting}
              value={dateHired}
              onChange={(e) => setDateHired(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Future hire dates are rejected (Asia/Manila calendar day).
            </p>
          </div>

          {isEditing && employeeToEdit && (
            <div className="rounded-lg bg-slate-950/60 p-3 text-xs text-slate-400 border border-slate-800">
              <span className="font-semibold text-slate-300">
                Optimistic Concurrency Control:
              </span>{' '}
              Editing record version <strong className="text-indigo-400">v{employeeToEdit.version}</strong>.
              If another admin updates this employee concurrently, your update will be rejected safely.
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Confirm Onboard'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
