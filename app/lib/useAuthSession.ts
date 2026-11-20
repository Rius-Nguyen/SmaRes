"use client";

import { useCallback, useEffect, useState } from 'react';
import type { AuthRole } from '@/app/lib/auth';

export interface ClientAuthSession {
  isLoaded: boolean;
  isLoggedIn: boolean;
  userName: string;
  userRole: AuthRole | '';
  isAdmin: boolean;
  isStaffOrAdmin: boolean;
  clearClientSession: () => void;
}

function normalizeRole(role: unknown): AuthRole | '' {
  if (role === 'customer' || role === 'staff' || role === 'admin') {
    return role;
  }
  return '';
}

/**
 * Shared client hook that keeps UI authentication state synchronized with localStorage and /api/user/profile.
 */
export function useAuthSession(): ClientAuthSession {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<AuthRole | ''>('');

  useEffect(() => {
    let isCancelled = false;

    const applyLocalCache = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser) as { name?: string; role?: unknown };
          if (!isCancelled) {
            setUserName(userData.name || 'Người dùng');
            setUserRole(normalizeRole(userData.role));
            setIsLoggedIn(true);
            setIsLoaded(true);
          }
          return;
        }
      } catch {
        // Ignore malformed local cache; server check below reconciles state
      }
      if (!isCancelled) {
        setIsLoggedIn(false);
        setUserName('');
        setUserRole('');
        setIsLoaded(true);
      }
    };

    const checkSession = async () => {
      applyLocalCache();

      try {
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          cache: 'no-store',
        });

        if (isCancelled) return;

        if (response.ok) {
          const data = (await response.json()) as {
            user?: { id?: string; name?: string; email?: string; role?: unknown };
          };
          if (data.user) {
            const normalizedRole = normalizeRole(data.user.role);
            const safeUser = {
              id: data.user.id ?? '',
              name: data.user.name ?? '',
              email: data.user.email ?? '',
              role: normalizedRole,
            };
            localStorage.removeItem('token');
            localStorage.setItem('user', JSON.stringify(safeUser));
            setUserName(safeUser.name || 'Người dùng');
            setUserRole(normalizedRole);
            setIsLoggedIn(true);
          }
        } else if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsLoggedIn(false);
          setUserName('');
          setUserRole('');
        }
      } catch {
        // Keep cached state on transient network errors
      } finally {
        if (!isCancelled) {
          setIsLoaded(true);
        }
      }
    };

    const handleSessionSync = () => {
      void checkSession();
    };

    void checkSession();

    window.addEventListener('storage', handleSessionSync);
    window.addEventListener('auth-change', handleSessionSync);

    return () => {
      isCancelled = true;
      window.removeEventListener('storage', handleSessionSync);
      window.removeEventListener('auth-change', handleSessionSync);
    };
  }, []);

  const clearClientSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserName('');
    setUserRole('');
    window.dispatchEvent(new Event('auth-change'));
  }, []);

  return {
    isLoaded,
    isLoggedIn,
    userName,
    userRole,
    isAdmin: userRole === 'admin',
    isStaffOrAdmin: userRole === 'admin' || userRole === 'staff',
    clearClientSession,
  };
}
