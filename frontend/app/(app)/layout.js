'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useApp, SCREEN_PATH, firstScreen } from '@/lib/store';

export default function AppLayout({ children }) {
  const { user } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const key = Object.keys(SCREEN_PATH).find((k) => SCREEN_PATH[k] === pathname);
  const allowed = !key || !!user?.perms?.[key];

  useEffect(() => {
    if (user === undefined) return;                  // session still loading
    if (!user) { router.replace('/'); return; }
    if (!allowed) router.replace(firstScreen(user));
  }, [user, allowed, router]);

  if (!user || !allowed) return null;

  return (
    <div className="app">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}
