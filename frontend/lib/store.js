'use client';

import { createContext, useContext, useEffect, useState, useCallback, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, getStoredUser, getToken, clearSession, storeSession } from './api';
import { LABELS, DEFAULT_PHARMACY } from './labels';

const AppContext = createContext(null);

// Order also decides which page a role lands on after signing in.
export const SCREEN_ORDER = ['dash', 'pos', 'inv', 'sup', 'pur', 'sales', 'rx', 'proc', 'cust', 'loans', 'fin', 'exp', 'ana', 'users', 'set'];
export const SCREEN_PATH = {
  dash: '/dashboard', pos: '/pos', inv: '/inventory', sup: '/suppliers', pur: '/purchases',
  sales: '/invoices', rx: '/prescriptions', proc: '/procedures', cust: '/customers', loans: '/loans',
  fin: '/finance', exp: '/expenses', ana: '/analytics', users: '/users', set: '/settings'
};

// A screen normally needs the permission of the same name. These two are views over
// data the existing permissions already cover, so they reuse them — that keeps
// accounts created before these screens existed working without a migration.
export const SCREEN_PERMS = {
  loans: ['cust', 'fin'],
  exp: ['fin']
};

// Screens no permission can unlock — only the owner's account reaches them.
export const SUPER_ADMIN_SCREENS = ['users'];

export const isSuperAdmin = (user) => !!user?.superAdmin;

export const canSee = (user, screen) => {
  if (isSuperAdmin(user)) return true;
  if (SUPER_ADMIN_SCREENS.includes(screen)) return false;
  return (SCREEN_PERMS[screen] || [screen]).some((p) => !!user?.perms?.[p]);
};

// Actions, rather than screens. Adding and editing drugs is its own permission so
// it can be handed to one person without opening up the rest of the system;
// anything destructive stays with the super admin.
export const canEditDrugs = (user) => isSuperAdmin(user) || !!user?.perms?.invEdit;
export const canDelete = (user) => isSuperAdmin(user);

export function firstScreen(user) {
  const k = SCREEN_ORDER.find((s) => canSee(user, s));
  return k ? SCREEN_PATH[k] : '/';
}

const DEFAULT_SETTINGS = { currency: 'AFN', vatRate: 0, lowStockThreshold: 20, ...DEFAULT_PHARMACY };

export function AppProvider({ children }) {
  const [user, setUser] = useState(undefined);       // undefined = still loading, null = signed out
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState(null);        // screen being opened, null when idle
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getToken();
    const u = token ? getStoredUser() : null;
    setUser(u);
    if (!u) return;

    api('/settings').then(setSettings).catch(() => {});
    // The copy in storage is from whenever this person signed in. The super admin
    // can have changed what they may reach since, so the server's answer wins —
    // and it is what fills in the role for a session that predates it.
    api('/auth/me')
      .then((fresh) => { setUser(fresh); storeSession(token, fresh); })
      .catch(() => {});
  }, []);

  useEffect(() => { setTarget(null); }, [pathname]);

  /**
   * Move to another screen. Opening a screen for the first time has to fetch its
   * code, which on a slow connection is a second or two of nothing happening, so
   * the shell shows a progress bar until the new page is on screen. Each page then
   * puts up its own spinner while it loads its data.
   */
  const go = useCallback((path) => {
    if (path === pathname) return;
    setTarget(path);
    startTransition(() => router.push(path));
  }, [pathname, router]);

  const navigating = pending || (!!target && target !== pathname);
  const pendingPath = navigating ? target : null;

  const signOut = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    clearSession();
    window.location.href = '/';
  }, []);

  const refreshSettings = useCallback(() => api('/settings').then(setSettings).catch(() => {}), []);

  return (
    <AppContext.Provider value={{ user, setUser, settings, setSettings, refreshSettings, L: LABELS, signOut, go, navigating, pendingPath }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
