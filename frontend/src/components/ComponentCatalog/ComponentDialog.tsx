import React from 'react';
import { SalaryComponent } from '../../types/salary-component.js';
import { useComponentDialogViewModel } from '../../viewmodels/useComponentDialogViewModel.js';
import { X, AlertCircle, Loader2, Save } from 'lucide-react';

interface ComponentDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  component?: SalaryComponent | null;
  onClose: () => void;
  onSuccess: (component: SalaryComponent, mode: 'create' | 'edit') => void;
}

export const ComponentDialog: React.FC<ComponentDialogProps> = ({
  isOpen,
  mode,
  component,
  onClose,
  onSuccess,
}) => {
  const {
    name,
    setName,
    fieldError,
    generalError,
    isSubmitting,
    showDiscardConfirm,
    setShowDiscardConfirm,
    handleCloseAttempt,
    handleConfirmDiscard,
    handleSubmit,
  } = useComponentDialogViewModel({
    mode,
    component,
    onClose,
    onSuccess,
  });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold text-white">
              {mode === 'create' ? 'Create Salary Component' : 'Rename Salary Component'}
            </h2>
            {mode === 'edit' && component && (
              <p className="text-xs text-slate-400 mt-0.5">
                Current Version: <span className="font-mono text-indigo-400">v{component.version}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleCloseAttempt}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Discard confirmation overlay */}
        {showDiscardConfirm ? (
          <div className="p-6">
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-950/30 p-4 text-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-300">Unsaved Changes</h3>
                <p className="text-xs text-amber-200/80 mt-1">
                  You have unsaved changes in this dialog. Are you sure you want to discard them?
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition"
              >
                Discard Changes
              </button>
            </div>
          </div>
        ) : (
          /* Main Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {generalError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/50 p-3.5 text-xs text-red-200"
              >
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">Save Failed:</span> {generalError}
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="component-name-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Component Name <span className="text-indigo-400">*</span>
              </label>
              <input
                id="component-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                disabled={isSubmitting}
                placeholder="e.g. Night Shift Differential"
                autoFocus
                className={`w-full rounded-lg border bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:outline-none focus:ring-2 ${
                  fieldError
                    ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30'
                } disabled:opacity-50`}
              />
              {fieldError && (
                <p className="mt-1.5 text-xs text-red-400">{fieldError}</p>
              )}
              <p className="mt-1 text-[11px] text-slate-400">
                Shared definition names must be unique across all active components.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCloseAttempt}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{mode === 'create' ? 'Create Component' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
