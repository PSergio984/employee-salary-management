import { createContext } from 'react';
import { User } from '../types/auth.js';

export interface AuthContextType {
  user: User | null;
  expiresAt: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sessionError: string | null;
  sessionErrorType: 'expired' | 'network' | null;
  retryRestoreSession: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
