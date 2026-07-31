'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getStoredUser, getToken, clearSession } from './api';
import { LABELS, DEFAULT_PHARMACY } from './labels';

const AppContext = createContext(null);

// Order also decides which page a role lands on after signing in.
export const SCREEN_ORDER = ['dash', 'pos', 'inv', 'sup', 'pur', 'sales', 'rx', 'cust', 'fin', 'ana', 'set'];
export const SCREEN_PATH = {
  dash: '/dashboard', pos: '/pos', inv: '/inventory', sup: '/suppliers', pur: '/purchases',
  sales: '/invoices', rx: '/prescriptions', cust: '/customers', fin: '/finance', ana: '/analytics', set: '/settings'
};

export function firstScreen(user) {
  const k = SCREEN_ORDER.find((s) => user?.perms?.[s]);
  return k ? SCREEN_PATH[k] : '/';
}

const DEFAULT_SETTINGS = { currency: 'AFN', vatRate: 0, lowStockThreshold: 20, ...DEFAULT_PHARMACY };

export function AppProvider({ children }) {
  const [user, setUser] = useState(undefined);       // undefined = still loading, null = signed out
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    const u = getToken() ? getStoredUser() : null;
    setUser(u);
    if (u) api('/settings').then(setSettings).catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    clearSession();
    window.location.href = '/';
  }, []);

  const refreshSettings = useCallback(() => api('/settings').then(setSettings).catch(() => {}), []);

  return (
    <AppContext.Provider value={{ user, setUser, settings, setSettings, refreshSettings, L: LABELS, signOut }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
