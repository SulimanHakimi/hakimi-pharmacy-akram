'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, storeSession, getToken, getStoredUser } from '@/lib/api';
import { firstScreen, useApp } from '@/lib/store';
import { DEFAULT_PHARMACY } from '@/lib/labels';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u = getToken() ? getStoredUser() : null;
    if (u) router.replace(firstScreen(u));
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
      storeSession(token, user);
      setUser(user);
      router.replace(firstScreen(user));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 255, 255, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 }}>H</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{DEFAULT_PHARMACY.pharmacyName}</div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>Management System</div>
          </div>
        </div>
        <div>
          <div className="login-pitch" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.25, maxWidth: 380 }}>
            Run the whole pharmacy from one place.
          </div>
          <div style={{ fontSize: 15, opacity: 0.8, marginTop: 14, maxWidth: 380 }}>
            Sales and printed invoices, stock with buy and sell prices, suppliers, purchases and reports.
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.65 }}>{DEFAULT_PHARMACY.pharmacyAddress}</div>
      </div>

      <div className="login-form-side">
        <form className="login-form" onSubmit={submit}>
          <div style={{ fontSize: 24, fontWeight: 600 }}>Sign in</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, marginBottom: 20 }}>
            Enter your work email and password.
          </div>

          <div className="field-label">Email</div>
          <input className="field" type="email" autoComplete="username" value={email}
            onChange={(e) => setEmail(e.target.value)} style={{ height: 44, marginBottom: 12 }} required />

          <div className="field-label">Password</div>
          <input className="field" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} style={{ height: 44 }} required />

          {error && <div className="banner banner-error" style={{ marginTop: 12 }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}
            style={{ height: 48, marginTop: 20, fontSize: 15 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center', marginTop: 14 }}>
            Access depends on your account — the sales counter sees only the point of sale and invoices.
          </div>
        </form>
      </div>
    </div>
  );
}
