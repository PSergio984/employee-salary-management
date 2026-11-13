import React, { useEffect, useState, useCallback } from 'react';
import { Employee } from '../types/employee.js';
import {
  BasicSalaryRecord,
  SalarySummaryResponse,
} from '../types/salary.js';
import { salaryApi } from '../api/salary.js';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  DollarSign,
  Edit3,
  Hash,
  History as HistoryIcon,
  Layers,
  Percent,
  RefreshCw,
  Shield,
  User,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface EmployeeDetailProps {
  employee: Employee;
  onBack: () => void;
  onEdit: (employee: Employee) => void;
  onEmployeeUpdated?: (employee: Employee) => void;
}

type TabType = 'profile' | 'basic-salary' | 'rates' | 'history';

export const EmployeeDetail: React.FC<EmployeeDetailProps> = ({
  employee,
  onBack,
  onEdit,
  onEmployeeUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Salary state
  const [currentSalary, setCurrentSalary] = useState<BasicSalaryRecord | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);

  // Salary form state
  const [amountInput, setAmountInput] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [isSavingSalary, setIsSavingSalary] = useState(false);
  const [salarySuccessMsg, setSalarySuccessMsg] = useState<string | null>(null);

  // Rates state
  const [summaryData, setSummaryData] = useState<SalarySummaryResponse | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<BasicSalaryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  const loadSalaryData = useCallback(() => {
    void Promise.resolve().then(() => {
      setSalaryLoading(true);
      setSalaryError(null);
      salaryApi
        .getBasicSalary(employee.id)
        .then((res) => {
          setCurrentSalary(res.current);
          if (res.current) {
            setAmountInput(res.current.amount);
          } else {
            setAmountInput('');
          }
          setSalaryLoading(false);
        })
        .catch((err) => {
          setSalaryError(err instanceof Error ? err.message : 'Failed to load basic salary');
          setSalaryLoading(false);
        });
    });
  }, [employee.id]);

  const loadRatesData = useCallback(() => {
    void Promise.resolve().then(() => {
      setRatesLoading(true);
      setRatesError(null);
      salaryApi
        .getSalarySummary(employee.id)
        .then((res) => {
          setSummaryData(res);
          setRatesLoading(false);
        })
        .catch((err) => {
          setRatesError(err instanceof Error ? err.message : 'Failed to load salary rates');
          setRatesLoading(false);
        });
    });
  }, [employee.id]);

  const loadHistoryData = useCallback(() => {
    void Promise.resolve().then(() => {
      setHistoryLoading(true);
      setHistoryError(null);
      salaryApi
        .getBasicSalaryHistory(employee.id)
        .then((res) => {
          setHistoryItems(res.items);
          setHistoryLoading(false);
        })
        .catch((err) => {
          setHistoryError(err instanceof Error ? err.message : 'Failed to load salary history');
          setHistoryLoading(false);
        });
    });
  }, [employee.id]);

  useEffect(() => {
    if (activeTab === 'basic-salary') {
      loadSalaryData();
    } else if (activeTab === 'rates') {
      loadRatesData();
    } else if (activeTab === 'history') {
      loadHistoryData();
    }
  }, [activeTab, loadSalaryData, loadRatesData, loadHistoryData]);

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setAmountError(null);
    setSalarySuccessMsg(null);
    setSalaryError(null);

    const trimmed = amountInput.trim();
    if (!trimmed) {
      setAmountError('Amount is required');
      return;
    }

    if (!/^\d{1,12}(\.\d{1,2})?$/.test(trimmed)) {
      setAmountError(
        'Please enter a valid non-negative amount with up to 2 decimal places (e.g. 20000.00)',
      );
      return;
    }

    setIsSavingSalary(true);
    try {
      const res = await salaryApi.updateBasicSalary(employee.id, {
        amount: trimmed,
        expectedCurrentId: currentSalary ? currentSalary.id : null,
        expectedVersion: employee.version,
      });

      setCurrentSalary(res.current);
      setAmountInput(res.current ? res.current.amount : '');
      setSalarySuccessMsg('Basic salary saved successfully.');
      if (onEmployeeUpdated) {
        onEmployeeUpdated({
          ...employee,
          version: res.employeeVersion,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update salary';
      setSalaryError(msg);
      // Notice: amountInput is intentionally preserved on ordinary failure so user doesn't lose their input!
    } finally {
      setIsSavingSalary(false);
    }
  };

  const formatManilaDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatPeso = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return 'PHP 0.00';
    return `PHP ${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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
          <button
            onClick={() => setActiveTab('profile')}
            className={`border-b-2 pb-3 text-sm font-semibold transition ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('basic-salary')}
            className={`border-b-2 pb-3 text-sm font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'basic-salary'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>Basic Salary</span>
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`border-b-2 pb-3 text-sm font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'rates'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Percent className="h-4 w-4" />
            <span>Salary Rates</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`border-b-2 pb-3 text-sm font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HistoryIcon className="h-4 w-4" />
            <span>History</span>
          </button>
          <button
            disabled
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-slate-600 cursor-not-allowed"
            title="Component assignments attach in Ticket 05"
          >
            Assigned Components (Ticket 05)
          </button>
        </nav>
      </div>

      {/* TAB 1: Profile Details */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
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
                    {formatManilaDateTime(employee.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-400">Last Updated</dt>
                  <dd className="mt-1 text-xs text-slate-400">
                    {formatManilaDateTime(employee.updatedAt)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Basic Salary */}
      {activeTab === 'basic-salary' && (
        <div className="space-y-6">
          {salaryLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-400 p-4">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
              <span>Loading current salary...</span>
            </div>
          )}

          {salarySuccessMsg && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{salarySuccessMsg}</span>
            </div>
          )}

          {salaryError && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{salaryError}</span>
              </div>
              <button
                type="button"
                onClick={loadSalaryData}
                className="rounded bg-red-900/60 px-2.5 py-1 text-xs font-medium hover:bg-red-800 text-white"
              >
                Reload
              </button>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Salary Status Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Coins className="h-4 w-4 text-indigo-400" />
                <span>Current Basic Salary Status</span>
              </h2>

              {currentSalary ? (
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      {formatPeso(currentSalary.amount)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ month</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="inline-flex items-center rounded bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                    <span>• Recorded: {formatManilaDateTime(currentSalary.recordedAt)}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="inline-flex items-center rounded bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
                    Unassigned
                  </span>
                  <p className="text-xs text-slate-400">
                    This employee does not currently have a basic salary assigned. Use the form to assign their first basic salary.
                  </p>
                </div>
              )}
            </div>

            {/* Assign/Update Salary Form */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-indigo-400" />
                <span>{currentSalary ? 'Update Basic Salary' : 'Assign Basic Salary'}</span>
              </h2>

              {!employee.isActive ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-4 text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    This employee is currently archived. Basic salary cannot be assigned or updated for archived employees.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSaveSalary} className="space-y-4">
                  <div>
                    <label
                      htmlFor="salary-amount"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                    >
                      Monthly Basic Salary (PHP) *
                    </label>
                    <div className="relative mt-1.5">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-400">
                        PHP
                      </span>
                      <input
                        id="salary-amount"
                        type="text"
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        placeholder="e.g. 25000.00"
                        className="w-full rounded-lg border border-slate-700 bg-slate-800/90 py-2 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    {amountError && (
                      <p className="mt-1.5 text-xs text-red-400">{amountError}</p>
                    )}
                    <p className="mt-1.5 text-xs text-slate-500">
                      Accepts 0 to 2 decimal places. Max PHP 999,999,999,999.99. Submitting the identical amount is safely handled as a no-op.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingSalary}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50"
                    >
                      {isSavingSalary && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                      <span>{isSavingSalary ? 'Saving...' : 'Save Basic Salary'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Salary Rates */}
      {activeTab === 'rates' && (
        <div className="space-y-6">
          {ratesLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-400 p-4">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
              <span>Calculating rates...</span>
            </div>
          )}

          {ratesError && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{ratesError}</span>
              </div>
              <button
                type="button"
                onClick={loadRatesData}
                className="rounded bg-red-900/60 px-2.5 py-1 text-xs font-medium hover:bg-red-800 text-white"
              >
                Retry
              </button>
            </div>
          )}

          {summaryData && !summaryData.hasBasicSalary ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-amber-200">Rates Unavailable</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                This employee does not have an active basic salary assigned. Please assign a basic salary in the Basic Salary tab to view annual, daily, hourly, and minute rates.
              </p>
              <button
                onClick={() => setActiveTab('basic-salary')}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Go to Basic Salary
              </button>
            </div>
          ) : summaryData?.rates.basic ? (
            <div className="space-y-6">
              {/* Rate Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {/* Monthly */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
                    <span>Monthly</span>
                    <Coins className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-white">
                    {formatPeso(summaryData.rates.basic.monthly)}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Base salary basis</p>
                </div>

                {/* Annual */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
                    <span>Annual</span>
                    <Calendar className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-white">
                    {formatPeso(summaryData.rates.basic.annual)}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Monthly × 12</p>
                </div>

                {/* Daily */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
                    <span>Daily</span>
                    <Clock className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-white">
                    {formatPeso(summaryData.rates.basic.daily)}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Annual ÷ 314 days</p>
                </div>

                {/* Hourly */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
                    <span>Hourly</span>
                    <Clock className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-white">
                    {formatPeso(summaryData.rates.basic.hourly)}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Daily ÷ 8 hours</p>
                </div>

                {/* Per Minute */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
                    <span>Per Minute</span>
                    <Clock className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-white">
                    {formatPeso(summaryData.rates.basic.minute)}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Hourly ÷ 60 minutes</p>
                </div>
              </div>

              {/* Explanatory Technical Notes */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-slate-200">
                  <Percent className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Philippine Statutory Computation Standards</span>
                </div>
                <p>
                  Rates are calculated using Philippine statutory labor factors: <strong>314 days/year</strong>, <strong>8 hours/day</strong>, and <strong>60 minutes/hour</strong>.
                </p>
                <p>
                  Calculations maintain exact integer-scaled decimal precision throughout and apply standard half-up rounding only at final display, preventing chained-rounding distortion (such as the 101.40 hourly regression).
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 4: History */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Basic Salary History</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audited chronological log of all salary assignments and adjustments for this employee.
              </p>
            </div>
            <button
              onClick={loadHistoryData}
              disabled={historyLoading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Log</span>
            </button>
          </div>

          {historyLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-400 p-4">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
              <span>Loading salary history...</span>
            </div>
          )}

          {historyError && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-200 flex items-center justify-between">
              <span>{historyError}</span>
              <button
                type="button"
                onClick={loadHistoryData}
                className="rounded bg-red-900/60 px-2 py-1 text-xs text-white"
              >
                Retry
              </button>
            </div>
          )}

          {!historyLoading && historyItems.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-500">
              No salary history records found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Record ID</th>
                    <th className="px-6 py-3 font-semibold">Monthly Amount</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Effective From</th>
                    <th className="px-6 py-3 font-semibold">Ended At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {historyItems.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        #{record.id}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {formatPeso(record.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                            record.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                          }`}
                        >
                          {record.isActive ? 'Active' : 'Retired'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        {formatManilaDateTime(record.recordedAt)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {record.endedAt ? (
                          formatManilaDateTime(record.endedAt)
                        ) : (
                          <span className="text-emerald-400 font-medium">Present</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
