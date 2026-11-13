import React, { useState } from 'react';
import { CreateEmployeePayload, Employee } from '../types/employee.js';
import { ApiError } from '../api/client.js';
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
  const isEditing = Boolean(employeeToEdit);

  // Today in Manila for date picker max
  const todayInManila = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const [employeeId, setEmployeeId] = useState(
    employeeToEdit?.employeeId || '',
  );
  const [firstName, setFirstName] = useState(employeeToEdit?.firstName || '');
  const [middleName, setMiddleName] = useState(
    employeeToEdit?.middleName || '',
  );
  const [lastName, setLastName] = useState(employeeToEdit?.lastName || '');
  const [dateHired, setDateHired] = useState(
    employeeToEdit?.dateHired || todayInManila,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side quick checks
    if (!employeeId.trim()) {
      setErrorMessage('Employee ID is required.');
      return;
    }
    if (!firstName.trim()) {
      setErrorMessage('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setErrorMessage('Last name is required.');
      return;
    }
    if (!dateHired) {
      setErrorMessage('Date hired is required.');
      return;
    }
    if (dateHired > todayInManila) {
      setErrorMessage(
        `Date hired cannot be in the future (today in Manila: ${todayInManila}).`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && employeeToEdit && onSubmitEdit) {
        const updated = await onSubmitEdit(employeeToEdit.id, {
          expectedVersion: employeeToEdit.version,
          employeeId: employeeId.trim(),
          firstName: firstName.trim(),
          middleName: middleName.trim() || null,
          lastName: lastName.trim(),
          dateHired,
        });
        onSuccess(updated);
        onClose();
      } else if (onSubmitCreate) {
        const created = await onSubmitCreate({
          employeeId: employeeId.trim(),
          firstName: firstName.trim(),
          middleName: middleName.trim() || undefined,
          lastName: lastName.trim(),
          dateHired,
        });
        onSuccess(created);
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'DUPLICATE_EMPLOYEE_ID') {
          setErrorMessage(
            `Employee ID "${employeeId.trim()}" is already in use by another record.`,
          );
        } else if (err.code === 'VERSION_CONFLICT') {
          setErrorMessage(
            'This employee record was modified by another request. Please cancel, reload, and review.',
          );
        } else {
          setErrorMessage(err.message || 'Failed to save employee.');
        }
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : 'An unexpected error occurred.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? 'Edit Employee Record' : 'Onboard New Employee'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <label
              htmlFor="modal-employeeId"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Employee ID <span className="text-red-400">*</span>
            </label>
            <input
              id="modal-employeeId"
              type="text"
              required
              disabled={isSubmitting}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="EMP-001 or 00123"
              className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-slate-400">
              Unique ID across all active and archived records. Preserves leading zeros.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="modal-firstName"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                id="modal-firstName"
                type="text"
                required
                disabled={isSubmitting}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="José"
                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="modal-middleName"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Middle Name <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                id="modal-middleName"
                type="text"
                disabled={isSubmitting}
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="D'Angelo"
                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="modal-lastName"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Last Name <span className="text-red-400">*</span>
            </label>
            <input
              id="modal-lastName"
              type="text"
              required
              disabled={isSubmitting}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Dela Cruz"
              className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="modal-dateHired"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Date Hired <span className="text-red-400">*</span>
            </label>
            <input
              id="modal-dateHired"
              type="date"
              required
              max={todayInManila}
              disabled={isSubmitting}
              value={dateHired}
              onChange={(e) => setDateHired(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-slate-400">
              Cannot exceed current Philippine calendar date ({todayInManila}).
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Employee'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
