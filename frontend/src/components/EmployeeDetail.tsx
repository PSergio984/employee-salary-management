import React from 'react';
import { Employee } from '../types/employee.js';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Edit3,
  Hash,
  Layers,
  Shield,
  User,
} from 'lucide-react';

interface EmployeeDetailProps {
  employee: Employee;
  onBack: () => void;
  onEdit: (employee: Employee) => void;
}

export const EmployeeDetail: React.FC<EmployeeDetailProps> = ({
  employee,
  onBack,
  onEdit,
}) => {
  const fullName = [employee.firstName, employee.middleName, employee.lastName]
    .filter(Boolean)
    .join(' ');

  const formattedHireDate = new Date(
    `${employee.dateHired}T00:00:00.000Z`,
  ).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Directory</span>
        </button>

        <button
          onClick={() => onEdit(employee)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-indigo-500"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Persistent Identity Header (Story 12) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <User className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  {fullName}
                </h1>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                    employee.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {employee.isActive ? 'Active' : 'Archived'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-slate-500" />
                  Employee ID: <strong className="text-slate-200">{employee.employeeId}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  Hired: <strong className="text-slate-200">{formattedHireDate}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-slate-500" />
                  Version: <strong className="text-slate-200">v{employee.version}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="border-b border-slate-800">
        <nav className="flex gap-4">
          <button className="border-b-2 border-indigo-500 pb-3 text-sm font-semibold text-white">
            Profile Details
          </button>
          <button
            disabled
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-slate-500 cursor-not-allowed"
          >
            Basic Salary (Ticket 03)
          </button>
          <button
            disabled
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-slate-500 cursor-not-allowed"
          >
            Assigned Components (Ticket 05)
          </button>
          <button
            disabled
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-slate-500 cursor-not-allowed"
          >
            Salary Rates (Ticket 05)
          </button>
          <button
            disabled
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-slate-500 cursor-not-allowed"
          >
            History (Ticket 03/05)
          </button>
        </nav>
      </div>

      {/* Profile Overview Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-400" />
            <span>Personal Information</span>
          </h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">First Name</dt>
              <dd className="mt-1 font-medium text-slate-100">{employee.firstName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Middle Name</dt>
              <dd className="mt-1 font-medium text-slate-100">
                {employee.middleName || <span className="text-slate-500">None</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Last Name</dt>
              <dd className="mt-1 font-medium text-slate-100">{employee.lastName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Date Hired</dt>
              <dd className="mt-1 font-medium text-slate-100">{employee.dateHired}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <span>System Metadata</span>
          </h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Internal Record ID</dt>
              <dd className="mt-1 font-mono text-slate-200">#{employee.id}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Optimistic Version</dt>
              <dd className="mt-1 font-mono text-slate-200">v{employee.version}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Created At</dt>
              <dd className="mt-1 text-xs text-slate-400">
                {new Date(employee.createdAt).toLocaleString('en-PH', {
                  timeZone: 'Asia/Manila',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Last Updated</dt>
              <dd className="mt-1 text-xs text-slate-400">
                {new Date(employee.updatedAt).toLocaleString('en-PH', {
                  timeZone: 'Asia/Manila',
                })}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Follow-on Slice Notice */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 flex items-start gap-3 text-xs text-slate-400">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Ticket 02 (Employee Onboarding) Complete:</strong>{' '}
          Employee profile is established with normalized textual IDs, strict Asia/Manila hire dates, and versioned concurrency control. Basic salary assignment and component allocations will attach in Ticket 03 and Ticket 05.
        </div>
      </div>
    </div>
  );
};
