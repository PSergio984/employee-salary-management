import { useState, useEffect, useCallback } from 'react';
import {
  SalaryComponent,
  PaginatedSalaryComponents,
} from '../types/salary-component.js';
import { fetchSalaryComponents } from '../api/salary-components.js';
import { ApiError } from '../api/client.js';

export function useComponentCatalogViewModel() {
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

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return {
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
  };
}
