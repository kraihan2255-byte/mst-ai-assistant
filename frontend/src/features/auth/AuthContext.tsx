import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../../types/api';
import { authApi } from '../../lib/api-client';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  pinLogin: (pin: string, rememberDevice?: boolean) => Promise<void>;
  quickUnlock: (rememberDevice?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session or auto-unlock on initial mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const data = await authApi.getMe();
        if (isMounted) {
          setUser(data.user);
        }
      } catch {
        // If session cookie/token check failed, check if device was set to auto-unlock
        if (typeof window !== 'undefined' && localStorage.getItem('mst_auto_unlock') === 'true') {
          try {
            const unlockData = await authApi.quickUnlock();
            if (isMounted) {
              setUser(unlockData.user);
            }
            return;
          } catch {
            // Auto-unlock failed, reset
          }
        }
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await authApi.login(username, password);
    setUser(data.user);
  }, []);

  const pinLogin = useCallback(async (pin: string, rememberDevice = true) => {
    const data = await authApi.pinLogin(pin);
    if (rememberDevice && typeof window !== 'undefined') {
      localStorage.setItem('mst_auto_unlock', 'true');
    }
    setUser(data.user);
  }, []);

  const quickUnlock = useCallback(async (rememberDevice = true) => {
    const data = await authApi.quickUnlock();
    if (rememberDevice && typeof window !== 'undefined') {
      localStorage.setItem('mst_auto_unlock', 'true');
    }
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, pinLogin, quickUnlock, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
