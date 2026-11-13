import { useState, useCallback } from 'react';
import { useAuth } from '../context/useAuth.js';
import { ApiError } from '../api/client.js';

export function useLoginViewModel() {
  const { login, sessionError, retryRestoreSession } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      if (!username.trim() || !password) {
        setErrorMessage('Please enter both username and password.');
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        await login(username.trim(), password);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'INVALID_CREDENTIALS') {
            setErrorMessage('Invalid username or password.');
          } else if (err.code === 'CSRF_REJECTED') {
            setErrorMessage('Security verification failed. Please refresh the page.');
          } else {
            setErrorMessage(err.message || 'Login failed. Please try again.');
          }
        } else {
          setErrorMessage('Unable to reach server. Please check your connection.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [username, password, login],
  );

  return {
    username,
    setUsername,
    password,
    setPassword,
    isSubmitting,
    errorMessage,
    sessionError,
    retryRestoreSession,
    handleSubmit,
  };
}
