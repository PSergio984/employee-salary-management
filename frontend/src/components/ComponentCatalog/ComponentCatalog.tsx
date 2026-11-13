import React from 'react';
import { useComponentCatalogViewModel } from '../../viewmodels/useComponentCatalogViewModel.js';
import { ComponentDialog } from './ComponentDialog.js';
import {
  Plus,
  Search,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export const ComponentCatalog: React.FC = () => {
  const {
    data,
    loading,
    error,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    totalPages,
    isDialogOpen,
    setIsDialogOpen,
    dialogMode,
    selectedComponent,
    successBanner,
    reload,
    handleSearchSubmit,
    handleClearSearch,
    handleOpenCreate,
    handleOpenEdit,
    handleDialogSuccess,
  } = useComponentCatalogViewModel();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Salary Component Catalog
            </h1>
            <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              Ticket 04 Shared Definitions
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Define and maintain reusable dynamic salary components with active-name uniqueness and versioned rename safety.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Create Component</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div
          role="status"
          className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
        </div>
      )}

      {/* Search and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active components by name..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={reload}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={reload}
            className="rounded border border-red-500/40 bg-red-900/40 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-800/60"
          >
            Retry
          </button>
        </div>
      )}

      {/* Components Table Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Component Name
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Normalized Key
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Version
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Created
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                      <span className="text-xs">Loading salary components...</span>
                    </div>
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="h-8 w-8 text-slate-600" />
                      <p className="text-sm font-medium text-slate-300">
                        {search ? 'No matching components found' : 'No active components yet'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {search
                          ? 'Try adjusting your search terms or clearing the filter.'
                          : 'Get started by creating your first shared salary component definition.'}
                      </p>
                      {!search && (
                        <button
                          onClick={handleOpenCreate}
                          className="mt-2 flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Create Component</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {item.nameKey}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-indigo-400">
                      v{item.version}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString('en-PH', {
                        timeZone: 'Asia/Manila',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
                        title="Rename component"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Rename</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Deterministic Pagination Footer */}
        {data && data.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 bg-slate-900/40 px-6 py-3.5 text-xs text-slate-400">
            <div>
              Showing <span className="font-medium text-white">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-white">
                {Math.min(page * pageSize, data.total)}
              </span>{' '}
              of <span className="font-medium text-white">{data.total}</span> components
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-40 disabled:hover:bg-slate-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>

              <div className="px-2 text-xs font-medium text-slate-300">
                Page <span className="text-white">{page}</span> of{' '}
                <span className="text-white">{totalPages}</span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-40 disabled:hover:bg-slate-800"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      {isDialogOpen && (
        <ComponentDialog
          isOpen={isDialogOpen}
          mode={dialogMode}
          component={selectedComponent}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={handleDialogSuccess}
        />
      )}
    </div>
  );
};
