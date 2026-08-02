'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useApp, SCREEN_ORDER, SCREEN_PATH, canSee } from '@/lib/store';
import { avatar } from '@/lib/ui';

const ICONS = {
  dash: <><rect x="3" y="3" width="8" height="8" rx="2"></rect><rect x="13" y="3" width="8" height="8" rx="2"></rect><rect x="3" y="13" width="8" height="8" rx="2"></rect><rect x="13" y="13" width="8" height="8" rx="2"></rect></>,
  pos: <><circle cx="9" cy="20" r="1.5"></circle><circle cx="18" cy="20" r="1.5"></circle><path d="M3 3h2l2.6 12.5a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 8H6"></path></>,
  inv: <><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"></path><path d="M3 8l9 5 9-5"></path><path d="M12 13v8"></path></>,
  sup: <><path d="M1 5h13v11H1z"></path><path d="M14 9h4l3 3v4h-7"></path><circle cx="6" cy="18.5" r="1.8"></circle><circle cx="17.5" cy="18.5" r="1.8"></circle></>,
  pur: <><rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 4V2.5h6V4"></path><path d="M9 10h6M9 14h6"></path></>,
  sales: <><path d="M6 2h9l4 4v16H6z"></path><path d="M15 2v4h4"></path><path d="M9 12h6M9 16h6"></path></>,
  rx: <><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 7h8M8 11h5"></path><path d="M13 15l5 5M18 15l-5 5"></path></>,
  cust: <><circle cx="9" cy="8" r="3.5"></circle><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"></path><circle cx="17" cy="9" r="2.5"></circle><path d="M16.5 14.5c2.6 0.4 4.5 2.7 4.5 5.5"></path></>,
  loans: <><path d="M3 7.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5z"></path><path d="M3 7.5 15 4.2a1.4 1.4 0 0 1 1.8 1.1l.4 2.2"></path><circle cx="14" cy="13" r="1.6"></circle></>,
  fin: <><circle cx="12" cy="12" r="9"></circle><path d="M15 9.3c-.6-.8-1.6-1.3-3-1.3-1.9 0-3 .9-3 2s1.1 1.7 3 2c1.9.3 3 1 3 2s-1.1 2-3 2c-1.4 0-2.4-.5-3-1.3"></path><path d="M12 6.5v11"></path></>,
  exp: <><path d="M4 6a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"></path><path d="M15 4v5h5"></path><path d="M8.5 16.5h7"></path><path d="M12 10.5v3"></path></>,
  ana: <><path d="M3 21h18"></path><rect x="5" y="12" width="3.5" height="6" rx="1"></rect><rect x="10.5" y="7" width="3.5" height="11" rx="1"></rect><rect x="16" y="3" width="3.5" height="15" rx="1"></rect></>,
  set: <><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"></path></>
};

export default function Sidebar() {
  const { user, L, signOut, settings } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  if (!user) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--primary)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>H</div>
        <div className="brand-text">
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{settings.pharmacyName}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Management System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {SCREEN_ORDER.filter((k) => canSee(user, k)).map((k) => (
          <button key={k} onClick={() => router.push(SCREEN_PATH[k])}
            className={`nav-btn${pathname === SCREEN_PATH[k] ? ' active' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ flexShrink: 0 }}>{ICONS[k]}</svg>
            {L[k]}
          </button>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="avatar" style={avatar(34)}>{user.initials}</div>
        <div className="who" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user.role}</div>
        </div>
        <button onClick={signOut} title="Sign out" aria-label="Sign out"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--faint)', padding: 4 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg>
        </button>
      </div>
    </aside>
  );
}
