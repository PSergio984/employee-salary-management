import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SalaryComponent,
  PaginatedSalaryComponents,
  ComponentArchiveImpact,
} from '../types/salary-component.js';
import {
  fetchSalaryComponents,
  fetchComponentArchiveImpact,
  archiveSalaryComponent,
} from '../api/salary-components.js';
import { ApiError } from '../api/client.js';

export function useComponentCatalogViewModel() {
  const [data, setData] = useState<PaginatedSalaryComponents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<'active' | 'archived'>('active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const pageSize = 20;

  // Dialog state (Create / Rename)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedComponent, setSelectedComponent] = useState<SalaryComponent | null>(null);

  // Archive confirmation dialog state
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<SalaryComponent | null>(null);
  const [archiveImpact, setArchiveImpact] = useState<ComponentArchiveImpact | null>(null);
  const archiveImpactRef = useRef<ComponentArchiveImpact | null>(null);
  archiveImpactRef.current = archiveImpact;

  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveConflict, setArchiveConflict] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Success banner
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleTabChange = useCallback((newTab: 'active' | 'archived') => {
    setStatusTab(newTab);
    setSearch('');
    setPage(1);
    setLoading(true);
  }, []);

  useEffect(() => {
    let ignore = false;

    fetchSalaryComponents({
      search: search.trim() || undefined,
      status: statusTab,
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
  }, [search, statusTab, page, pageSize, refreshKey]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setPage(1);
      reload();
    },
    [reload],
  );

  const handleClearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
    reload();
  }, [reload]);

  const handleOpenCreate = useCallback(() => {
    setSelectedComponent(null);
    setDialogMode('create');
    setIsDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((comp: SalaryComponent) => {
    setSelectedComponent(comp);
    setDialogMode('edit');
    setIsDialogOpen(true);
  }, []);

  const handleDialogSuccess = useCallback(
    (comp: SalaryComponent, mode: 'create' | 'edit') => {
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
    },
    [reload],
  );

  // Global component archive flows
  const handleOpenArchive = useCallback((comp: SalaryComponent) => {
    setArchiveTarget(comp);
    setArchiveImpact(null);
    archiveImpactRef.current = null;
    setArchiveError(null);
    setArchiveConflict(false);
    setIsArchiveDialogOpen(true);
    setArchiveLoading(true);

    fetchComponentArchiveImpact(comp.id)
      .then((impact) => {
        archiveImpactRef.current = impact;
        setArchiveImpact(impact);
        setArchiveLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError) {
          setArchiveError(err.message);
        } else {
          setArchiveError('Failed to load component archive impact. Please retry.');
        }
        setArchiveLoading(false);
      });
  }, []);

  const handleCancelArchive = useCallback(() => {
    setIsArchiveDialogOpen(false);
    setArchiveTarget(null);
    setArchiveImpact(null);
    archiveImpactRef.current = null;
    setArchiveError(null);
    setArchiveConflict(false);
  }, []);

  const handleConfirmArchive = useCallback(async () => {
    const impactToUse = archiveImpactRef.current || archiveImpact;
    if (!archiveTarget || !impactToUse) return;

    setIsArchiving(true);
    setArchiveError(null);

    try {
      const res = await archiveSalaryComponent(archiveTarget.id, {
        expectedVersion: impactToUse.version,
        expectedAffectedCount: impactToUse.affectedEmployeeCount,
      });

      setIsArchiveDialogOpen(false);
      setArchiveTarget(null);
      setArchiveImpact(null);
      archiveImpactRef.current = null;
      setArchiveConflict(false);
      setIsArchiving(false);

      const msg = `Component "${res.name}" was successfully archived. ${res.deactivatedAssignmentsCount} active assignment(s) were deactivated.`;
      setSuccessBanner(msg);
      setTimeout(() => {
        setSuccessBanner((prev) => (prev === msg ? null : prev));
      }, 6000);

      reload();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        // Concurrency / stale impact conflict: fetch fresh preview and require new confirmation
        setArchiveConflict(true);
        setArchiveError(
          err.message ||
            'Impact changed while preview was open. Fresh impact has been loaded below. Please review and confirm again.',
        );

        // Fetch latest preview
        try {
          const freshImpact = await fetchComponentArchiveImpact(archiveTarget.id);
          archiveImpactRef.current = freshImpact;
          setArchiveImpact(freshImpact);
        } catch {
          // Keep current impact if fetch fails
        }
      } else if (err instanceof ApiError) {
        setArchiveError(err.message);
      } else {
        setArchiveError('Failed to archive component. Please try again.');
      }
    } finally {
      setIsArchiving(false);
    }
  }, [archiveTarget, archiveImpact, reload]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return {
    data,
    loading,
    error,
    statusTab,
    handleTabChange,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    totalPages,
    // Create/Edit Dialog
    isDialogOpen,
    setIsDialogOpen,
    dialogMode,
    selectedComponent,
    handleOpenCreate,
    handleOpenEdit,
    handleDialogSuccess,
    // Archive Confirmation Dialog
    isArchiveDialogOpen,
    archiveTarget,
    archiveImpact,
    archiveLoading,
    archiveError,
    archiveConflict,
    isArchiving,
    handleOpenArchive,
    handleCancelArchive,
    handleConfirmArchive,
    // General
    successBanner,
    reload,
    handleSearchSubmit,
    handleClearSearch,
  };
}
