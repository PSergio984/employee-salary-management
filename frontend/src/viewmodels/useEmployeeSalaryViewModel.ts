import { useState, useCallback, useEffect } from 'react';
import { Employee } from '../types/employee.js';
import {
  BasicSalaryRecord,
  EmployeeComponentRecord,
  SalarySummaryResponse,
} from '../types/salary.js';
import { SalaryComponent } from '../types/salary-component.js';
import { salaryApi } from '../api/salary.js';
import { fetchSalaryComponents } from '../api/salary-components.js';
import { ApiError } from '../api/client.js';

export type SalaryTabType =
  | 'profile'
  | 'basic-salary'
  | 'components'
  | 'rates'
  | 'history';

export function useEmployeeSalaryViewModel(
  employee: Employee,
  onEmployeeUpdated?: (employee: Employee) => void,
) {
  const [activeTab, setActiveTab] = useState<SalaryTabType>('profile');

  // Basic Salary state
  const [currentSalary, setCurrentSalary] = useState<BasicSalaryRecord | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);

  // Basic Salary form state
  const [amountInput, setAmountInput] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [isSavingSalary, setIsSavingSalary] = useState(false);
  const [salarySuccessMsg, setSalarySuccessMsg] = useState<string | null>(null);

  // Components state (Ticket 05)
  const [components, setComponents] = useState<EmployeeComponentRecord[]>([]);
  const [componentsLoading, setComponentsLoading] = useState(false);
  const [componentsError, setComponentsError] = useState<string | null>(null);
  const [componentSuccessMsg, setComponentSuccessMsg] = useState<string | null>(null);

  // Catalog items for assignment dropdown
  const [catalogItems, setCatalogItems] = useState<SalaryComponent[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Assign Component Dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | ''>('');
  const [addAmountInput, setAddAmountInput] = useState('');
  const [addAmountError, setAddAmountError] = useState<string | null>(null);
  const [isAddingComponent, setIsAddingComponent] = useState(false);

  // Edit Component Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<EmployeeComponentRecord | null>(null);
  const [editAmountInput, setEditAmountInput] = useState('');
  const [editAmountError, setEditAmountError] = useState<string | null>(null);
  const [isUpdatingComponent, setIsUpdatingComponent] = useState(false);

  // Remove Component Confirmation Dialog
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [removingComponent, setRemovingComponent] = useState<EmployeeComponentRecord | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isRemovingComponent, setIsRemovingComponent] = useState(false);

  // Rates state
  const [summaryData, setSummaryData] = useState<SalarySummaryResponse | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<BasicSalaryRecord[]>([]);
  const [componentHistoryItems, setComponentHistoryItems] = useState<EmployeeComponentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  const loadComponentsData = useCallback(() => {
    void Promise.resolve().then(() => {
      setComponentsLoading(true);
      setComponentsError(null);
      salaryApi
        .getEmployeeComponents(employee.id)
        .then((res) => {
          setComponents(res.items);
          setComponentsLoading(false);
        })
        .catch((err) => {
          setComponentsError(
            err instanceof Error ? err.message : 'Failed to load employee components',
          );
          setComponentsLoading(false);
        });
    });
  }, [employee.id]);

  const loadCatalogItems = useCallback(() => {
    void Promise.resolve().then(() => {
      setCatalogLoading(true);
      fetchSalaryComponents({ status: 'active', page: 1, pageSize: 100 })
        .then((res) => {
          setCatalogItems(res.items);
          setCatalogLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load catalog definitions:', err);
          setCatalogLoading(false);
        });
    });
  }, []);

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
      Promise.all([
        salaryApi.getBasicSalaryHistory(employee.id),
        salaryApi.getEmployeeComponentsHistory(employee.id),
      ])
        .then(([basicHistory, compHistory]) => {
          setHistoryItems(basicHistory.items);
          setComponentHistoryItems(compHistory.items);
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
    } else if (activeTab === 'components') {
      loadComponentsData();
      loadCatalogItems();
      loadSalaryData(); // ensure basic salary status is fresh
    } else if (activeTab === 'rates') {
      loadRatesData();
    } else if (activeTab === 'history') {
      loadHistoryData();
    }
  }, [
    activeTab,
    loadSalaryData,
    loadComponentsData,
    loadCatalogItems,
    loadRatesData,
    loadHistoryData,
  ]);

  const handleSaveSalary = useCallback(
    async (e: React.FormEvent) => {
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
      } finally {
        setIsSavingSalary(false);
      }
    },
    [amountInput, currentSalary, employee, onEmployeeUpdated],
  );

  // Assign Component handlers
  const handleOpenAddDialog = useCallback(() => {
    setSelectedCatalogId('');
    setAddAmountInput('');
    setAddAmountError(null);
    setIsAddDialogOpen(true);
  }, []);

  const handleAssignComponent = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAddAmountError(null);
      setComponentSuccessMsg(null);

      if (!selectedCatalogId) {
        setAddAmountError('Please select a salary component to assign.');
        return;
      }

      const trimmed = addAmountInput.trim();
      if (!trimmed) {
        setAddAmountError('Amount is required');
        return;
      }

      if (!/^\d{1,12}(\.\d{1,2})?$/.test(trimmed)) {
        setAddAmountError(
          'Please enter a valid non-negative amount with up to 2 decimal places (e.g. 5000.00)',
        );
        return;
      }

      setIsAddingComponent(true);
      try {
        const res = await salaryApi.assignEmployeeComponent(employee.id, {
          componentId: Number(selectedCatalogId),
          amount: trimmed,
          expectedVersion: employee.version,
        });

        setComponentSuccessMsg(`Assigned component "${res.item.name}" successfully.`);
        setIsAddDialogOpen(false);
        loadComponentsData();
        if (onEmployeeUpdated) {
          onEmployeeUpdated({
            ...employee,
            version: res.employeeVersion,
          });
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setAddAmountError(err.message);
        } else {
          setAddAmountError(
            err instanceof Error ? err.message : 'Failed to assign component',
          );
        }
      } finally {
        setIsAddingComponent(false);
      }
    },
    [selectedCatalogId, addAmountInput, employee, onEmployeeUpdated, loadComponentsData],
  );

  // Edit Component handlers
  const handleOpenEditComponent = useCallback((comp: EmployeeComponentRecord) => {
    setEditingComponent(comp);
    setEditAmountInput(comp.amount);
    setEditAmountError(null);
    setIsEditDialogOpen(true);
  }, []);

  const handleUpdateComponent = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingComponent) return;
      setEditAmountError(null);
      setComponentSuccessMsg(null);

      const trimmed = editAmountInput.trim();
      if (!trimmed) {
        setEditAmountError('Amount is required');
        return;
      }

      if (!/^\d{1,12}(\.\d{1,2})?$/.test(trimmed)) {
        setEditAmountError(
          'Please enter a valid non-negative amount with up to 2 decimal places (e.g. 5000.00)',
        );
        return;
      }

      setIsUpdatingComponent(true);
      try {
        const res = await salaryApi.updateEmployeeComponent(
          employee.id,
          editingComponent.componentId,
          {
            amount: trimmed,
            expectedCurrentId: editingComponent.id,
            expectedVersion: employee.version,
          },
        );

        setComponentSuccessMsg(`Updated component "${res.item.name}" successfully.`);
        setIsEditDialogOpen(false);
        setEditingComponent(null);
        loadComponentsData();
        if (onEmployeeUpdated) {
          onEmployeeUpdated({
            ...employee,
            version: res.employeeVersion,
          });
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setEditAmountError(err.message);
        } else {
          setEditAmountError(
            err instanceof Error ? err.message : 'Failed to update component',
          );
        }
      } finally {
        setIsUpdatingComponent(false);
      }
    },
    [editingComponent, editAmountInput, employee, onEmployeeUpdated, loadComponentsData],
  );

  // Remove Component handlers
  const handleOpenRemoveComponent = useCallback((comp: EmployeeComponentRecord) => {
    setRemovingComponent(comp);
    setRemoveError(null);
    setIsRemoveDialogOpen(true);
  }, []);

  const handleConfirmRemoveComponent = useCallback(async () => {
    if (!removingComponent) return;
    setRemoveError(null);
    setComponentSuccessMsg(null);
    setIsRemovingComponent(true);

    try {
      const res = await salaryApi.removeEmployeeComponent(
        employee.id,
        removingComponent.componentId,
        {
          expectedCurrentId: removingComponent.id,
          expectedVersion: employee.version,
        },
      );

      setComponentSuccessMsg(
        `Component "${removingComponent.name}" was removed and archived in history.`,
      );
      setIsRemoveDialogOpen(false);
      setRemovingComponent(null);
      loadComponentsData();
      if (onEmployeeUpdated) {
        onEmployeeUpdated({
          ...employee,
          version: res.employeeVersion,
        });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setRemoveError(err.message);
      } else {
        setRemoveError(
          err instanceof Error ? err.message : 'Failed to remove component',
        );
      }
    } finally {
      setIsRemovingComponent(false);
    }
  }, [removingComponent, employee, onEmployeeUpdated, loadComponentsData]);

  return {
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
  };
}
