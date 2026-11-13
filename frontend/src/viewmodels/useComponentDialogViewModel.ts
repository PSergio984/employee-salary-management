import { useState, useCallback } from 'react';
import {
  SalaryComponent,
  CreateSalaryComponentInput,
  UpdateSalaryComponentInput,
} from '../types/salary-component.js';
import {
  createSalaryComponent,
  updateSalaryComponent,
} from '../api/salary-components.js';
import { ApiError } from '../api/client.js';

interface UseComponentDialogViewModelProps {
  mode: 'create' | 'edit';
  component?: SalaryComponent | null;
  onClose: () => void;
  onSuccess: (component: SalaryComponent, mode: 'create' | 'edit') => void;
}

export function useComponentDialogViewModel({
  mode,
  component,
  onClose,
  onSuccess,
}: UseComponentDialogViewModelProps) {
  const defaultName = mode === 'edit' && component ? component.name : '';
  const [name, setName] = useState(defaultName);
  const [initialName] = useState(defaultName);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty = name !== initialName;

  const handleCloseAttempt = useCallback(() => {
    if (isSubmitting) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [isSubmitting, isDirty, onClose]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldError(null);
      setGeneralError(null);

      const trimmedName = name.trim();
      if (!trimmedName) {
        setFieldError('Component name cannot be blank.');
        return;
      }

      if (trimmedName.length > 100) {
        setFieldError('Component name cannot exceed 100 characters.');
        return;
      }

      setIsSubmitting(true);
      try {
        if (mode === 'create') {
          const payload: CreateSalaryComponentInput = { name: trimmedName };
          const created = await createSalaryComponent(payload);
          onSuccess(created, 'create');
        } else if (mode === 'edit' && component) {
          const payload: UpdateSalaryComponentInput = {
            name: trimmedName,
            expectedVersion: component.version,
          };
          const updated = await updateSalaryComponent(component.id, payload);
          onSuccess(updated, 'edit');
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 409) {
            setGeneralError(err.message);
          } else if (err.fieldErrors?.name) {
            setFieldError(err.fieldErrors.name.join(', '));
          } else {
            setGeneralError(err.message || 'Operation failed. Please review and retry.');
          }
        } else {
          setGeneralError('An unexpected error occurred. Please retry.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, mode, component, onSuccess],
  );

  return {
    name,
    setName,
    fieldError,
    generalError,
    isSubmitting,
    showDiscardConfirm,
    setShowDiscardConfirm,
    isDirty,
    handleCloseAttempt,
    handleConfirmDiscard,
    handleSubmit,
  };
}
