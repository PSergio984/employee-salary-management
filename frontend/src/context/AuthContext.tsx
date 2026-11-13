import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User } from '../types/auth.js';
import { getSessionApi, loginApi, logoutApi } from '../api/auth.js';
import { ApiError, setUnauthorizedListener } from '../api/client.js';
import { AuthContext } from './authContextDef.js';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionErrorType, setSessionErrorType] = useState<'expired' | 'network' | null>(null);
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasAuthenticatedRef = useRef<boolean>(false);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const scheduleExpiry = useCallback((expiryIso: string) => {
    clearExpiryTimer();
    const expiryTime = new Date(expiryIso).getTime();
    const delay = expiryTime - Date.now();

    if (delay <= 0) {
      setUser(null);
      setExpiresAt(null);
      wasAuthenticatedRef.current = false;
      setSessionError('Your session has expired. Please sign in again.');
      setSessionErrorType('expired');
      return;
    }

    expiryTimerRef.current = setTimeout(() => {
      setUser(null);
      setExpiresAt(null);
      wasAuthenticatedRef.current = false;
      setSessionError('Your 8-hour session has reached its fixed limit. Please sign in again.');
      setSessionErrorType('expired');
    }, delay);
  }, [clearExpiryTimer]);

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    setSessionError(null);
    setSessionErrorType(null);
    try {
      const session = await getSessionApi();
      setUser(session.user);
      setExpiresAt(session.expiresAt);
      wasAuthenticatedRef.current = true;
      scheduleExpiry(session.expiresAt);
    } catch (err) {
      clearExpiryTimer();
      setUser(null);
      setExpiresAt(null);
      wasAuthenticatedRef.current = false;

      if (err instanceof ApiError) {
        if (err.status !== 401) {
          setSessionError(
            err.message || 'Unable to connect to authentication server. Please check your connection and retry.',
          );
          setSessionErrorType('network');
        }
      } else {
        setSessionError('Unable to connect to authentication server. Please check your connection and retry.');
        setSessionErrorType('network');
      }
    } finally {
      setIsLoading(false);
    }
  }, [clearExpiryTimer, scheduleExpiry]);

  useEffect(() => {
    let isMounted = true;

    getSessionApi()
      .then((session) => {
        if (!isMounted) return;
        setUser(session.user);
        setExpiresAt(session.expiresAt);
        wasAuthenticatedRef.current = true;
        scheduleExpiry(session.expiresAt);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        clearExpiryTimer();
        setUser(null);
        setExpiresAt(null);
        wasAuthenticatedRef.current = false;
        if (err instanceof ApiError) {
          if (err.status !== 401) {
            setSessionError(
              err.message || 'Unable to connect to authentication server. Please check your connection and retry.',
            );
            setSessionErrorType('network');
          }
        } else {
          setSessionError('Unable to connect to authentication server. Please check your connection and retry.');
          setSessionErrorType('network');
        }
        setIsLoading(false);
      });

    setUnauthorizedListener(() => {
      clearExpiryTimer();
      const hadUser = wasAuthenticatedRef.current;
      setUser(null);
      setExpiresAt(null);
      wasAuthenticatedRef.current = false;
      if (hadUser) {
        setSessionError('Your session was revoked or expired on the server. Please sign in again.');
        setSessionErrorType('expired');
      }
    });

    return () => {
      isMounted = false;
      clearExpiryTimer();
      setUnauthorizedListener(null);
    };
  }, [clearExpiryTimer, scheduleExpiry]);

  const login = async (username: string, password: string) => {
    setSessionError(null);
    setSessionErrorType(null);
    const session = await loginApi(username, password);
    setUser(session.user);
    setExpiresAt(session.expiresAt);
    wasAuthenticatedRef.current = true;
    scheduleExpiry(session.expiresAt);
  };

  const logout = async () => {
    await logoutApi();
    clearExpiryTimer();
    setUser(null);
    setExpiresAt(null);
    wasAuthenticatedRef.current = false;
    setSessionError(null);
    setSessionErrorType(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        expiresAt,
        isLoading,
        login,
        logout,
        sessionError,
        sessionErrorType,
        retryRestoreSession: restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
