import { useState, useCallback } from 'react';
import { CreateEmployeePayload, Employee } from '../types/employee.js';
import { ApiError } from '../api/client.js';

interface UseEmployeeModalViewModelProps {
  employeeToEdit?: Employee | null;
  onSubmitCreate?: (payload: CreateEmployeePayload) => Promise<Employee>;
  onSubmitEdit?: (
    id: number,
    payload: {
      expectedVersion: number;
      employeeId?: string;
      firstName?: string;
      middleName?: string | null;
      lastName?: string;
      dateHired?: string;
    },
  ) => Promise<Employee>;
  onSuccess: (employee: Employee) => void;
  onClose: () => void;
}

export function useEmployeeModalViewModel({
  employeeToEdit,
  onSubmitCreate,
  onSubmitEdit,
  onSuccess,
  onClose,
}: UseEmployeeModalViewModelProps) {
  const isEditing = Boolean(employeeToEdit);

  // Today in Manila for date picker max
  const todayInManila = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const [employeeId, setEmployeeId] = useState(employeeToEdit?.employeeId || '');
  const [firstName, setFirstName] = useState(employeeToEdit?.firstName || '');
  const [middleName, setMiddleName] = useState(employeeToEdit?.middleName || '');
  const [lastName, setLastName] = useState(employeeToEdit?.lastName || '');
  const [dateHired, setDateHired] = useState(employeeToEdit?.dateHired || todayInManila);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);

      // Client-side quick checks
      if (!employeeId.trim()) {
        setErrorMessage('Employee ID is required.');
        return;
      }
      if (!firstName.trim()) {
        setErrorMessage('First name is required.');
        return;
      }
      if (!lastName.trim()) {
        setErrorMessage('Last name is required.');
        return;
      }
      if (!dateHired) {
        setErrorMessage('Date hired is required.');
        return;
      }
      if (dateHired > todayInManila) {
        setErrorMessage(
          `Date hired cannot be in the future (today in Manila: ${todayInManila}).`,
        );
        return;
      }

      setIsSubmitting(true);
      try {
        if (isEditing && employeeToEdit && onSubmitEdit) {
          const updated = await onSubmitEdit(employeeToEdit.id, {
            expectedVersion: employeeToEdit.version,
            employeeId: employeeId.trim(),
            firstName: firstName.trim(),
            middleName: middleName.trim() || null,
            lastName: lastName.trim(),
            dateHired,
          });
          onSuccess(updated);
          onClose();
        } else if (onSubmitCreate) {
          const created = await onSubmitCreate({
            employeeId: employeeId.trim(),
            firstName: firstName.trim(),
            middleName: middleName.trim() || undefined,
            lastName: lastName.trim(),
            dateHired,
          });
          onSuccess(created);
          onClose();
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 409) {
            setErrorMessage(err.message);
          } else if (err.fieldErrors) {
            const firstField = Object.keys(err.fieldErrors)[0];
            const firstError = err.fieldErrors[firstField]?.[0];
            setErrorMessage(firstError || err.message);
          } else {
            setErrorMessage(err.message);
          }
        } else {
          setErrorMessage('Failed to save employee. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      employeeId,
      firstName,
      middleName,
      lastName,
      dateHired,
      isEditing,
      employeeToEdit,
      onSubmitCreate,
      onSubmitEdit,
      onSuccess,
      onClose,
      todayInManila,
    ],
  );

  return {
    isEditing,
    todayInManila,
    employeeId,
    setEmployeeId,
    firstName,
    setFirstName,
    middleName,
    setMiddleName,
    lastName,
    setLastName,
    dateHired,
    setDateHired,
    isSubmitting,
    errorMessage,
    handleSubmit,
  };
}
