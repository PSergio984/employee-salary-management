import React from 'react';
import { Employee } from '../types/employee.js';
import { useEmployeeSalaryViewModel } from '../viewmodels/useEmployeeSalaryViewModel.js';
import {
  ArrowLeft,
  Calendar,
  Coins,
  DollarSign,
  Edit2,
  Edit3,
  Hash,
  History as HistoryIcon,
  Layers,
  Percent,
  Plus,
  RefreshCw,
  Trash2,
  User,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';

interface EmployeeDetailProps {
  employee: Employee;
  onBack: () => void;
  onEdit: (employee: Employee) => void;
  onEmployeeUpdated?: (employee: Employee) => void;
}

export const EmployeeDetail: React.FC<EmployeeDetailProps> = ({
  employee,
  onBack,
  onEdit,
  onEmployeeUpdated,
}) => {
  const {
    activeTab,
    setActiveTab,
    // Basic Salary
    currentSalary,
    salaryLoading,
    salaryError,
    amountInput,
    setAmountInput,
    amountError,
    isSavingSalary,
    salarySuccessMsg,
    handleSaveSalary,
    loadSalaryData,
    // Components
    components,
    componentsLoading,
    componentsError,
    componentSuccessMsg,
    catalogItems,
    catalogLoading,
    loadComponentsData,
    // Assign Dialog
    isAddDialogOpen,
    setIsAddDialogOpen,
    selectedCatalogId,
    setSelectedCatalogId,
    addAmountInput,
    setAddAmountInput,
    addAmountError,
    isAddingComponent,
    handleOpenAddDialog,
    handleAssignComponent,
    // Edit Dialog
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingComponent,
    editAmountInput,
    setEditAmountInput,
    editAmountError,
    isUpdatingComponent,
    handleOpenEditComponent,
    handleUpdateComponent,
    // Remove Dialog
    isRemoveDialogOpen,
    setIsRemoveDialogOpen,
    removingComponent,
    removeError,
    isRemovingComponent,
    handleOpenRemoveComponent,
    handleConfirmRemoveComponent,
    // Rates
    summaryData,
    ratesLoading,
    ratesError,
    loadRatesData,
    // History
    historyItems,
    componentHistoryItems,
    historyLoading,
    historyError,
    loadHistoryData,
  } = useEmployeeSalaryViewModel(employee, onEmployeeUpdated);

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

  const hasBasicSalary = Boolean(currentSalary);

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
          disabled={!employee.isActive}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Employee Identity Hero Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <User className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-white">{fullName}</h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    employee.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {employee.isActive ? 'Active' : 'Archived'}
                </span>
                <span className="font-mono text-xs text-indigo-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  v{employee.version}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-mono">
                  <Hash className="h-3.5 w-3.5 text-slate-500" />
                  {employee.employeeId}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  Hired {formattedHireDate}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end rounded-lg bg-slate-950/60 p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400">Current Basic Salary</span>
            <span className="text-base font-bold text-emerald-400">
              {currentSalary ? formatPeso(currentSalary.amount) : 'Unassigned'}
            </span>
          </div>
        </div>
      </div>

      {/* Detail Navigation Tabs */}
      <div className="border-b border-slate-800">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('basic-salary')}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === 'basic-salary'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>Basic Salary</span>
          </button>

          <button
            onClick={() => setActiveTab('components')}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === 'components'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Assigned Components ({components.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rates')}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === 'rates'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>Salary Rates</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HistoryIcon className="h-4 w-4" />
            <span>History</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: Profile Details */}
      {activeTab === 'profile' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-white mb-4">Personal & Organization</h2>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <dt className="text-slate-400">Employee ID</dt>
                <dd className="font-mono text-white">{employee.employeeId}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <dt className="text-slate-400">First Name</dt>
                <dd className="text-white">{employee.firstName}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <dt className="text-slate-400">Middle Name</dt>
                <dd className="text-slate-300">{employee.middleName || '(None)'}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <dt className="text-slate-400">Last Name</dt>
                <dd className="text-white">{employee.lastName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Date Hired</dt>
                <dd className="text-white">{formattedHireDate}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-white mb-4">Record Metadata & Security</h2>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <dt className="text-slate-400">Internal ID</dt>
                <dd className="font-mono text-slate-400">#{employee.id}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <dt className="text-slate-400">Concurrency Version</dt>
                <dd className="font-mono text-indigo-400">v{employee.version}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <dt className="text-slate-400">Created At</dt>
                <dd className="text-slate-300">{formatManilaDateTime(employee.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Last Updated</dt>
                <dd className="text-slate-300">{formatManilaDateTime(employee.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* TAB 2: Basic Salary Assignment */}
      {activeTab === 'basic-salary' && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {currentSalary ? 'Update Basic Salary' : 'Assign Basic Salary'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monthly basic salary in Philippine Peso (PHP). Prior assignments are preserved immutably in history.
                </p>
              </div>
              <button
                type="button"
                onClick={loadSalaryData}
                disabled={salaryLoading}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
              >
                <RefreshCw className={`h-3 w-3 ${salaryLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {salarySuccessMsg && (
              <div
                role="status"
                className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{salarySuccessMsg}</span>
              </div>
            )}

            {salaryError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <div className="flex-1 font-medium">{salaryError}</div>
              </div>
            )}

            <form onSubmit={handleSaveSalary} className="space-y-4">
              <div>
                <label htmlFor="basic-amount" className="block text-xs font-medium text-slate-300">
                  Monthly Basic Amount (PHP) <span className="text-red-400">*</span>
                </label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs font-semibold">
                    ₱
                  </div>
                  <input
                    id="basic-amount"
                    type="text"
                    required
                    disabled={isSavingSalary || !employee.isActive}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="20000.00"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-8 pr-3 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
                {amountError && (
                  <p className="mt-1.5 text-xs text-red-400">{amountError}</p>
                )}
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Non-negative numeric amount up to 2 decimal places. Explicit zero qualifies as an assigned salary.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingSalary || !employee.isActive}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSavingSalary ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Salary...</span>
                    </>
                  ) : (
                    <span>{currentSalary ? 'Save New Salary' : 'Assign Initial Salary'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Assigned Components (Ticket 05) */}
      {activeTab === 'components' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Assigned Salary Components</h2>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                  Ticket 05 Active Assignments
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic shared components assigned with employee-specific amounts. Historical rows are preserved on change or removal.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadComponentsData}
                disabled={componentsLoading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${componentsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddDialog}
                disabled={!hasBasicSalary || !employee.isActive}
                title={
                  !hasBasicSalary
                    ? 'Basic salary must be assigned before assigning components'
                    : undefined
                }
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>Assign Component</span>
              </button>
            </div>
          </div>

          {!hasBasicSalary && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs text-amber-200 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300">Prerequisite Required:</span> An employee must have an assigned basic salary before any salary components can be assigned. Please go to the <strong>Basic Salary</strong> tab to assign a salary first (zero qualifies).
              </div>
            </div>
          )}

          {componentSuccessMsg && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{componentSuccessMsg}</span>
            </div>
          )}

          {componentsError && (
            <div
              role="alert"
              className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-950/50 p-4 text-xs text-red-200"
            >
              <span>{componentsError}</span>
              <button
                type="button"
                onClick={loadComponentsData}
                className="rounded bg-red-900/60 px-2 py-1 text-xs text-white"
              >
                Retry
              </button>
            </div>
          )}

          {componentsLoading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
              <span className="ml-2 text-xs">Loading assigned components...</span>
            </div>
          ) : components.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-500">
              No salary components assigned to this employee yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Component</th>
                    <th className="px-6 py-3 font-semibold">Monthly Amount</th>
                    <th className="px-6 py-3 font-semibold">Assigned Date</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {components.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span>{comp.name}</span>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-400">
                        {formatPeso(comp.amount)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {formatManilaDateTime(comp.recordedAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditComponent(comp)}
                            disabled={!employee.isActive}
                            className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                          >
                            <Edit2 className="h-3 w-3 text-indigo-400" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenRemoveComponent(comp)}
                            disabled={!employee.isActive}
                            className="flex items-center gap-1 rounded border border-red-900/40 bg-red-950/40 px-2.5 py-1 text-xs text-red-300 hover:bg-red-900/60 disabled:opacity-40"
                          >
                            <Trash2 className="h-3 w-3 text-red-400" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ADD COMPONENT DIALOG */}
          {isAddDialogOpen && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            >
              <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-base font-semibold text-white">Assign Salary Component</h3>
                  <button
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isAddingComponent}
                    className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {addAmountError && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <div className="flex-1 font-medium">{addAmountError}</div>
                  </div>
                )}

                <form onSubmit={handleAssignComponent} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="component-select" className="block text-xs font-medium text-slate-300 mb-1">
                      Salary Component Definition <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="component-select"
                      required
                      value={selectedCatalogId}
                      onChange={(e) => setSelectedCatalogId(e.target.value ? Number(e.target.value) : '')}
                      disabled={isAddingComponent || catalogLoading}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="">-- Select Active Component --</option>
                      {catalogItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="component-amount" className="block text-xs font-medium text-slate-300 mb-1">
                      Monthly Amount (PHP) <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="component-amount"
                      type="text"
                      required
                      value={addAmountInput}
                      onChange={(e) => setAddAmountInput(e.target.value)}
                      disabled={isAddingComponent}
                      placeholder="5000.00"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Non-negative amount up to 2 decimal places. Input is preserved on validation errors.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isAddingComponent}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingComponent}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {isAddingComponent ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Assigning...</span>
                        </>
                      ) : (
                        <span>Assign Component</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* EDIT COMPONENT DIALOG */}
          {isEditDialogOpen && editingComponent && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            >
              <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-base font-semibold text-white">
                    Update Component Amount: {editingComponent.name}
                  </h3>
                  <button
                    onClick={() => setIsEditDialogOpen(false)}
                    disabled={isUpdatingComponent}
                    className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {editAmountError && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <div className="flex-1 font-medium">{editAmountError}</div>
                  </div>
                )}

                <form onSubmit={handleUpdateComponent} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="edit-amount" className="block text-xs font-medium text-slate-300 mb-1">
                      New Monthly Amount (PHP) <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="edit-amount"
                      type="text"
                      required
                      value={editAmountInput}
                      onChange={(e) => setEditAmountInput(e.target.value)}
                      disabled={isUpdatingComponent}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Changing amount creates a new current assignment while preserving prior records in history. Same-amount save is a safe no-op.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsEditDialogOpen(false)}
                      disabled={isUpdatingComponent}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingComponent}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {isUpdatingComponent ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Save Amount</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* REMOVE COMPONENT CONFIRMATION DIALOG */}
          {isRemoveDialogOpen && removingComponent && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            >
              <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white">Remove Component Assignment</h3>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                      Are you sure you want to remove <strong>{removingComponent.name}</strong> ({formatPeso(removingComponent.amount)})?
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      The assignment will be ended and archived in history. It will no longer be included in current total salary rates, but previous records remain preserved.
                    </p>
                  </div>
                </div>

                {removeError && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <div className="flex-1 font-medium">{removeError}</div>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsRemoveDialogOpen(false)}
                    disabled={isRemovingComponent}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRemoveComponent}
                    disabled={isRemovingComponent}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {isRemovingComponent ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <span>Confirm Removal</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Salary Rates Breakdown */}
      {activeTab === 'rates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Salary Rates & Total Breakdown</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact statutory labor rate computations derived server-side from unrounded monthly compensation.
              </p>
            </div>
            <button
              onClick={loadRatesData}
              disabled={ratesLoading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${ratesLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Rates</span>
            </button>
          </div>

          {ratesLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-400 p-4">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
              <span>Computing rates...</span>
            </div>
          )}

          {ratesError && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-200 flex items-center justify-between">
              <span>{ratesError}</span>
              <button
                type="button"
                onClick={loadRatesData}
                className="rounded bg-red-900/60 px-2 py-1 text-xs text-white"
              >
                Retry
              </button>
            </div>
          )}

          {!ratesLoading && summaryData && !summaryData.hasBasicSalary ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-400">
              Basic salary is currently unassigned. Assign a basic salary to compute Philippine labor rates.
            </div>
          ) : !ratesLoading && summaryData && summaryData.rates.basic ? (
            <div className="space-y-6">
              {/* Basic Salary Rates Grid */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  1. Basic-Only Rates (Monthly: {formatPeso(summaryData.basicSalary || '0')})
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <span className="text-[11px] font-medium text-slate-400">Annual Basic</span>
                    <div className="mt-1 text-lg font-bold text-white">
                      {formatPeso(summaryData.rates.basic.annual)}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">Monthly × 12 months</p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <span className="text-[11px] font-medium text-slate-400">Daily Basic</span>
                    <div className="mt-1 text-lg font-bold text-white">
                      {formatPeso(summaryData.rates.basic.daily)}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">Annual ÷ 314 factor</p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <span className="text-[11px] font-medium text-slate-400">Hourly Basic</span>
                    <div className="mt-1 text-lg font-bold text-white">
                      {formatPeso(summaryData.rates.basic.hourly)}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">Daily ÷ 8 hours</p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <span className="text-[11px] font-medium text-slate-400">Per-Minute Basic</span>
                    <div className="mt-1 text-lg font-bold text-white">
                      {formatPeso(summaryData.rates.basic.minute)}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">Hourly ÷ 60 minutes</p>
                  </div>
                </div>
              </div>

              {/* Active Component Breakdown Table */}
              {summaryData.components.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    2. Active Components Breakdown
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-6 py-2.5 font-semibold">Component</th>
                          <th className="px-6 py-2.5 font-semibold text-right">Monthly Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {summaryData.components.map((comp) => (
                          <tr key={comp.id}>
                            <td className="px-6 py-3 font-medium text-white">{comp.name}</td>
                            <td className="px-6 py-3 text-right font-semibold text-emerald-400">
                              {formatPeso(comp.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total Compensation Rates Grid */}
              {summaryData.rates.total && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      3. Total Compensation Rates (Monthly Total: {formatPeso(summaryData.totalMonthlyCompensation || summaryData.basicSalary || '0')})
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
                      <span className="text-[11px] font-medium text-indigo-300">Total Annual</span>
                      <div className="mt-1 text-lg font-bold text-white">
                        {formatPeso(summaryData.rates.total.annual)}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">Total Monthly × 12</p>
                    </div>

                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
                      <span className="text-[11px] font-medium text-indigo-300">Total Daily</span>
                      <div className="mt-1 text-lg font-bold text-white">
                        {formatPeso(summaryData.rates.total.daily)}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">Total Annual ÷ 314</p>
                    </div>

                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
                      <span className="text-[11px] font-medium text-indigo-300">Total Hourly</span>
                      <div className="mt-1 text-lg font-bold text-white">
                        {formatPeso(summaryData.rates.total.hourly)}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">Total Daily ÷ 8</p>
                    </div>

                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
                      <span className="text-[11px] font-medium text-indigo-300">Total Minute</span>
                      <div className="mt-1 text-lg font-bold text-white">
                        {formatPeso(summaryData.rates.total.minute)}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">Total Hourly ÷ 60</p>
                    </div>
                  </div>
                </div>
              )}

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
                  Calculations maintain exact integer-scaled decimal precision throughout and apply standard half-up rounding only at final display, preventing chained-rounding distortion.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 5: History */}
      {activeTab === 'history' && (
        <div className="space-y-8">
          {/* Section A: Basic Salary History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Basic Salary History</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audited chronological log of all basic salary assignments and adjustments.
                </p>
              </div>
              <button
                onClick={loadHistoryData}
                disabled={historyLoading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 text-white disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {historyError && (
              <div
                role="alert"
                className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-950/50 p-4 text-xs text-red-200"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{historyError}</span>
                </div>
                <button
                  type="button"
                  onClick={loadHistoryData}
                  className="rounded bg-red-900/60 px-2 py-1 text-xs text-white"
                >
                  Retry
                </button>
              </div>
            )}

            {historyLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-400 p-4">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                <span>Loading history...</span>
              </div>
            )}

            {!historyLoading && historyItems.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 text-center text-xs text-slate-500">
                No basic salary history records found.
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
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">#{record.id}</td>
                        <td className="px-6 py-4 font-bold text-white">{formatPeso(record.amount)}</td>
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

          {/* Section B: Component Assignments History */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">Component Assignments History</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audited chronological log of all component assignments, amount changes, and removals.
              </p>
            </div>

            {!historyLoading && componentHistoryItems.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 text-center text-xs text-slate-500">
                No component assignment history records found.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Record ID</th>
                      <th className="px-6 py-3 font-semibold">Component</th>
                      <th className="px-6 py-3 font-semibold">Amount</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Assigned At</th>
                      <th className="px-6 py-3 font-semibold">Ended At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {componentHistoryItems.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">#{record.id}</td>
                        <td className="px-6 py-4 font-medium text-white">{record.name}</td>
                        <td className="px-6 py-4 font-bold text-emerald-400">{formatPeso(record.amount)}</td>
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
        </div>
      )}
    </div>
  );
};
