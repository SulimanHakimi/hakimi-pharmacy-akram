'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { dateStr, ago } from '@/lib/format';

const CURRENCIES = ['AFN', 'USD', 'PKR'];

export default function SettingsPage() {
  const { settings, setSettings, user, L } = useApp();
  const [logs, setLogs] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState(null);

  const loadLogs = () => api('/logs').then(setLogs).catch(() => {});
  useEffect(() => { loadLogs(); }, []);
  useEffect(() => {
    setProfile({
      pharmacyName: settings.pharmacyName || '',
      pharmacyAddress: settings.pharmacyAddress || '',
      pharmacyPhone: settings.pharmacyPhone || '',
      pharmacyLicense: settings.pharmacyLicense || ''
    });
  }, [settings]);

  async function save(patch) {
    setError(''); setNotice('');
    try {
      setSettings(await api('/settings', { method: 'PUT', body: patch }));
      setNotice('Settings saved.');
      loadLogs();
    } catch (e) { setError(e.message); }
  }

  // The export is returned as JSON and saved by the browser — serverless hosts have
  // no writable disk to keep a copy on.
  async function backupNow() {
    setError(''); setNotice('');
    setBusy(true);
    try {
      const { settings: s, dump } = await api('/settings/backup', { method: 'POST' });
      setSettings(s);
      const url = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `hakimi-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice('Backup downloaded.');
      loadLogs();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function changePassword() {
    setPwErr(''); setPwMsg('');
    if (pw.newPassword !== pw.confirm) { setPwErr('The two new passwords do not match.'); return; }
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setPwMsg('Password changed.');
      loadLogs();
    } catch (e) { setPwErr(e.message); }
  }

  const setP = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));
  if (!profile) return null;

  return (
    <>
      <div className="page-head"><h1>{L.set}</h1></div>

      {notice && <div className="banner banner-ok" style={{ marginBottom: 14 }}>{notice}</div>}
      {error && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="grid-3" style={{ marginBottom: 14, alignItems: 'start' }}>
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Pricing</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Applies to every price and new sale.</div>

          <div className="field-label">Currency</div>
          <select value={settings.currency} onChange={(e) => save({ currency: e.target.value })} className="field" style={{ marginBottom: 12 }}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          <div className="field-label">VAT rate (%)</div>
          <input type="number" min="0" max="15" step="0.5" defaultValue={settings.vatRate} className="field" style={{ marginBottom: 12 }}
            onBlur={(e) => Number(e.target.value) !== settings.vatRate && save({ vatRate: e.target.value })} />

          <div className="field-label">Low stock alert below</div>
          <input type="number" min="1" max="1000" defaultValue={settings.lowStockThreshold} className="field"
            onBlur={(e) => Number(e.target.value) !== settings.lowStockThreshold && save({ lowStockThreshold: e.target.value })} />
        </div>

        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Your password</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            Signed in as {user?.name} ({user?.email}).
          </div>
          <div className="form-grid">
            <input type="password" autoComplete="current-password" placeholder="Current password" className="field"
              value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} />
            <input type="password" autoComplete="new-password" placeholder="New password (min 8 characters)" className="field"
              value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} />
            <input type="password" autoComplete="new-password" placeholder="Repeat new password" className="field"
              value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
            {pwErr && <div className="banner banner-error">{pwErr}</div>}
            {pwMsg && <div className="banner banner-ok">{pwMsg}</div>}
            <button onClick={changePassword} className="btn btn-ghost btn-block">Change password</button>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Database backup</div>
          <div className="list-row">
            <div style={{ flex: 1, fontSize: 13, color: 'var(--muted)' }}>Last backup</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{settings.lastBackup ? ago(settings.lastBackup) : 'Never'}</div>
          </div>
          <button onClick={backupNow} disabled={busy} className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>
            {busy ? 'Preparing…' : 'Download backup'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
            Saves a JSON copy of every record to your computer. Passwords are not included.
            Keep the file somewhere safe.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Pharmacy details</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          Printed at the top of every invoice and report. Blank fields are left off the printout.
        </div>
        <div className="form-grid">
          <div className="form-row">
            <input value={profile.pharmacyName} onChange={setP('pharmacyName')} placeholder="Pharmacy name" className="field" />
            <input value={profile.pharmacyAddress} onChange={setP('pharmacyAddress')} placeholder="Address" className="field" />
          </div>
          <div className="form-row">
            <input value={profile.pharmacyPhone} onChange={setP('pharmacyPhone')} placeholder="Phone number" className="field" />
            <input value={profile.pharmacyLicense} onChange={setP('pharmacyLicense')} placeholder="Licence number" className="field" />
          </div>
          <button onClick={() => save(profile)} className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>
            Save pharmacy details
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>User activity log</div>
        <div className="table-wrap" style={{ border: 'none' }}>
          {logs.length === 0 ? (
            <div className="empty">No activity recorded yet.</div>
          ) : (
            <table className="data narrow" style={{ minWidth: 460 }}>
              <thead><tr><th>Time</th><th>User</th><th>Action</th></tr></thead>
              <tbody>
                {logs.map((x) => (
                  <tr key={x._id}>
                    <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{dateStr(x.t)}</td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{x.user}</td>
                    <td>{x.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
