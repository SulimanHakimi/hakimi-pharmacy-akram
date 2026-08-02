'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Loader, { RouteProgress } from '@/components/Loader';
import { useApp, SCREEN_PATH, firstScreen, canSee } from '@/lib/store';

export default function AppLayout({ children }) {
  const { user, navigating } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const key = Object.keys(SCREEN_PATH).find((k) => SCREEN_PATH[k] === pathname);
  const allowed = !key || canSee(user, key);

  useEffect(() => {
    if (user === undefined) return;                  // session still loading
    if (!user) { router.replace('/'); return; }
    if (!allowed) router.replace(firstScreen(user));
  }, [user, allowed, router]);

  // Reading the session back out of storage is quick, but on a cold load it still
  // means a frame or two of nothing — say what is happening instead.
  if (user === undefined) {
    return <div className="app-boot"><Loader label="Loading…" pad={0} /></div>;
  }
  if (!user || !allowed) return null;

  return (
    <div className="app">
      <RouteProgress active={navigating} />
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}
