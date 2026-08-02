'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getStoredUser, getToken, clearSession } from './api';
import { LABELS, DEFAULT_PHARMACY } from './labels';

const AppContext = createContext(null);

// Order also decides which page a role lands on after signing in.
export const SCREEN_ORDER = ['dash', 'pos', 'inv', 'sup', 'pur', 'sales', 'rx', 'cust', 'loans', 'fin', 'exp', 'ana', 'set'];
export const SCREEN_PATH = {
  dash: '/dashboard', pos: '/pos', inv: '/inventory', sup: '/suppliers', pur: '/purchases',
  sales: '/invoices', rx: '/prescriptions', cust: '/customers', loans: '/loans',
  fin: '/finance', exp: '/expenses', ana: '/analytics', set: '/settings'
};

// A screen normally needs the permission of the same name. These two are views over
// data the existing permissions already cover, so they reuse them — that keeps
// accounts created before these screens existed working without a migration.
export const SCREEN_PERMS = {
  loans: ['cust', 'fin'],
  exp: ['fin']
};

export const canSee = (user, screen) =>
  (SCREEN_PERMS[screen] || [screen]).some((p) => !!user?.perms?.[p]);

export function firstScreen(user) {
  const k = SCREEN_ORDER.find((s) => canSee(user, s));
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
