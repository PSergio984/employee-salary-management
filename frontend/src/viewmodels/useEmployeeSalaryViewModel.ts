import { useState, useCallback, useEffect } from 'react';
import { Employee } from '../types/employee.js';
import {
  BasicSalaryRecord,
  SalarySummaryResponse,
} from '../types/salary.js';
import { salaryApi } from '../api/salary.js';

export type SalaryTabType = 'profile' | 'basic-salary' | 'rates' | 'history';

export function useEmployeeSalaryViewModel(
  employee: Employee,
  onEmployeeUpdated?: (employee: Employee) => void,
) {
  const [activeTab, setActiveTab] = useState<SalaryTabType>('profile');

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

  return {
    activeTab,
    setActiveTab,
    currentSalary,
    salaryLoading,
    salaryError,
    amountInput,
    setAmountInput,
    amountError,
    isSavingSalary,
    salarySuccessMsg,
    summaryData,
    ratesLoading,
    ratesError,
    historyItems,
    historyLoading,
    historyError,
    loadSalaryData,
    loadRatesData,
    loadHistoryData,
    handleSaveSalary,
  };
}
