import { useState, useCallback, useEffect } from 'react';
import { Employee } from '../types/employee.js';
import {
  getEmployeesApi,
  getEmployeeByIdApi,
} from '../api/employees.js';

export function useEmployeesViewModel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Employee Detail state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getEmployeesApi({
        search,
        status: statusFilter,
        page,
        pageSize,
      });
      setEmployees(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch employees';
      setError(msg);
      console.error('Failed to fetch employees:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(() => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      getEmployeesApi({
        search,
        status: statusFilter,
        page,
        pageSize,
      })
        .then((res) => {
          if (!isMounted) return;
          setEmployees(res.items);
          setTotal(res.total);
          setTotalPages(res.totalPages);
          setIsLoading(false);
        })
        .catch((err) => {
          if (!isMounted) return;
          const msg = err instanceof Error ? err.message : 'Failed to fetch employees';
          setError(msg);
          console.error('Failed to fetch employees:', err);
          setIsLoading(false);
        });
    });

    return () => {
      isMounted = false;
    };
  }, [search, statusFilter, page, pageSize]);

  const handleOpenCreateModal = useCallback(() => {
    setEmployeeToEdit(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEmployeeToEdit(null);
  }, []);

  const handleModalSuccess = useCallback(
    (savedEmployee: Employee) => {
      setSelectedEmployee(savedEmployee);
      void fetchEmployees();
    },
    [fetchEmployees],
  );

  const handleRefreshSelectedEmployee = useCallback(async (id: number) => {
    try {
      const refreshed = await getEmployeeByIdApi(id);
      setSelectedEmployee(refreshed);
    } catch (err) {
      console.error('Failed to refresh employee details:', err);
    }
  }, []);

  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((newStatus: 'active' | 'archived' | 'all') => {
    setStatusFilter(newStatus);
    setPage(1);
  }, []);

  return {
    employees,
    total,
    page,
    pageSize,
    setPageSize,
    totalPages,
    search,
    statusFilter,
    isLoading,
    error,
    selectedEmployee,
    setSelectedEmployee,
    isModalOpen,
    employeeToEdit,
    fetchEmployees,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
    handleModalSuccess,
    handleRefreshSelectedEmployee,
    handleSearchChange,
    handleStatusFilterChange,
    setPage,
  };
}
