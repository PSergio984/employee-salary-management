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
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      setSessionError('Your session has expired. Please sign in again.');
      return;
    }

    expiryTimerRef.current = setTimeout(() => {
      setUser(null);
      setExpiresAt(null);
      setSessionError('Your 8-hour session has reached its fixed limit. Please sign in again.');
    }, delay);
  }, [clearExpiryTimer]);

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    setSessionError(null);
    try {
      const session = await getSessionApi();
      setUser(session.user);
      setExpiresAt(session.expiresAt);
      scheduleExpiry(session.expiresAt);
    } catch (err) {
      setUser(null);
      setExpiresAt(null);
      clearExpiryTimer();

      if (err instanceof ApiError) {
        if (err.status !== 401) {
          setSessionError(
            err.message || 'Unable to verify session with backend. Please retry.',
          );
        }
      } else {
        setSessionError('Unable to connect to authentication server. Please retry.');
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
        scheduleExpiry(session.expiresAt);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setUser(null);
        setExpiresAt(null);
        clearExpiryTimer();
        if (err instanceof ApiError) {
          if (err.status !== 401) {
            setSessionError(
              err.message || 'Unable to verify session with backend. Please retry.',
            );
          }
        } else {
          setSessionError('Unable to connect to authentication server. Please retry.');
        }
        setIsLoading(false);
      });

    setUnauthorizedListener(() => {
      clearExpiryTimer();
      setUser(null);
      setExpiresAt(null);
      setSessionError('Your session was revoked or expired on the server. Please sign in again.');
    });

    return () => {
      isMounted = false;
      clearExpiryTimer();
      setUnauthorizedListener(null);
    };
  }, [clearExpiryTimer, scheduleExpiry]);

  const login = async (username: string, password: string) => {
    setSessionError(null);
    const session = await loginApi(username, password);
    setUser(session.user);
    setExpiresAt(session.expiresAt);
    scheduleExpiry(session.expiresAt);
  };

  const logout = async () => {
    await logoutApi();
    clearExpiryTimer();
    setUser(null);
    setExpiresAt(null);
    setSessionError(null);
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
        retryRestoreSession: restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
