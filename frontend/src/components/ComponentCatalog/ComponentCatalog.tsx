import React, { useState, useEffect, useCallback } from 'react';
import {
  SalaryComponent,
  PaginatedSalaryComponents,
} from '../../types/salary-component.js';
import { fetchSalaryComponents } from '../../api/salary-components.js';
import { ApiError } from '../../api/client.js';
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
  const [data, setData] = useState<PaginatedSalaryComponents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const pageSize = 20;

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedComponent, setSelectedComponent] = useState<SalaryComponent | null>(null);

  // Success banner
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    fetchSalaryComponents({
      search: search.trim() || undefined,
      status: 'active',
      page,
      pageSize,
    })
      .then((result) => {
        if (!ignore) {
          setData(result);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Failed to load salary component catalog. Please retry.');
          }
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [search, page, pageSize, refreshKey]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    reload();
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    reload();
  };

  const handleOpenCreate = () => {
    setSelectedComponent(null);
    setDialogMode('create');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (comp: SalaryComponent) => {
    setSelectedComponent(comp);
    setDialogMode('edit');
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = (comp: SalaryComponent, mode: 'create' | 'edit') => {
    setIsDialogOpen(false);
    const message =
      mode === 'create'
        ? `Component "${comp.name}" was successfully created.`
        : `Component was renamed to "${comp.name}" (version ${comp.version}).`;
    setSuccessBanner(message);
    setTimeout(() => {
      setSuccessBanner((prev) => (prev === message ? null : prev));
    }, 5000);
    reload();
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

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
          className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-950/60 p-4 text-sm text-emerald-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="rounded p-1 text-emerald-400 hover:bg-emerald-900/50 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-950/60 p-4 text-sm text-red-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={reload}
            className="flex items-center gap-1.5 rounded bg-red-800/80 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active components by name..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-10 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-2.5 rounded text-slate-500 hover:text-slate-300"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-3 self-end sm:self-center text-xs text-slate-400">
          <button
            onClick={reload}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
            title="Reload components"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <span>
            Total: <strong className="text-white">{data?.total ?? 0}</strong> components
          </span>
        </div>
      </div>

      {/* Main Catalog Table / List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm overflow-hidden">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
            <span className="text-sm font-medium">Loading component catalog...</span>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 mb-4">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No salary components found</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              {search
                ? `No components matched "${search}". Try clearing the search or checking spelling.`
                : 'Get started by creating your first dynamic shared salary component.'}
            </p>
            <div className="mt-5">
              {search ? (
                <button
                  onClick={handleClearSearch}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Component</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">
                      Component Name
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Version
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Date Created
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400 border border-slate-500/20">
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-indigo-300">
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
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition"
                          title="Rename component"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Rename</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800 bg-slate-950/40 px-6 py-3 text-xs text-slate-400 gap-3">
              <div>
                Showing <strong className="text-white">{(page - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-white">
                  {Math.min(page * pageSize, data.total)}
                </strong>{' '}
                of <strong className="text-white">{data.total}</strong> components
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-40 disabled:hover:bg-slate-900 disabled:hover:text-slate-300"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                <span className="px-2 font-medium text-slate-300">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-40 disabled:hover:bg-slate-900 disabled:hover:text-slate-300"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog - conditionally mounted only when open to guarantee clean per-open initialization */}
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
