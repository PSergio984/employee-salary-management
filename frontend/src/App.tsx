import React from 'react';
import { AuthProvider } from './context/AuthContext.js';
import { useAuth } from './context/useAuth.js';
import { LoginForm } from './components/LoginForm.js';
import { AppShell } from './components/AppShell.js';
import { Loader2 } from 'lucide-react';

const MainRouter: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Restoring session...</span>
        </div>
      </div>
    );
  }

  return user ? <AppShell /> : <LoginForm />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
};
