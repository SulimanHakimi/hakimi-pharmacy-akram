'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { GRANTABLE, ROLES } from '@/lib/labels';
import { avatar } from '@/lib/ui';
import Loader from '@/components/Loader';

const blank = () => ({
  name: '', email: '', role: ROLES[2], password: '', superAdmin: false,
  perms: Object.fromEntries(GRANTABLE.map((g) => [g.key, false]))
});

const granted = (u) => GRANTABLE.filter((g) => u.perms?.[g.key]);

export default function UsersPage() {
  const { user, L } = useApp();
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(null);            // null = closed, else the account being written
  const [editing, setEditing] = useState(null);      // id when editing, null when adding
  const [confirm, setConfirm] = useState(null);      // account queued for deletion
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/users').then(setUsers).catch((e) => setError(e.message)).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  function openAdd() {
    setForm(blank());
    setEditing(null);
    setError('');
    setNotice('');
  }

  function openEdit(u) {
    setForm({
      name: u.name, email: u.email, role: u.role, password: '', superAdmin: !!u.superAdmin,
      perms: Object.fromEntries(GRANTABLE.map((g) => [g.key, !!u.perms?.[g.key]]))
    });
    setEditing(u.id);
    setError('');
    setNotice('');
  }

  async function submit() {
    if (busy || !form) return;
    setBusy(true);
    setError('');
    try {
      // An empty password on an edit means "leave the current one alone".
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) await api(`/users/${editing}`, { method: 'PUT', body: payload });
      else await api('/users', { method: 'POST', body: payload });
      setNotice(editing ? 'Account updated.' : `${form.name.trim()} can now sign in.`);
      setForm(null);
      setEditing(null);
      load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function remove() {
    if (busy || !confirm) return;
    setBusy(true);
    setError('');
    try {
      await api(`/users/${confirm.id}`, { method: 'DELETE' });
      setNotice(`${confirm.name} no longer has an account.`);
      setConfirm(null);
      load();
    } catch (e) { setError(e.message); setConfirm(null); }
    setBusy(false);
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (k) => setForm((f) => ({ ...f, perms: { ...f.perms, [k]: !f.perms[k] } }));

  return (
    <>
      <div className="page-head">
        <h1>{L.users}</h1>
        <button onClick={openAdd} className="btn btn-primary">+ Add user</button>
      </div>

      {notice && <div className="banner banner-ok" style={{ marginBottom: 14 }}>{notice}</div>}
      {error && !form && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="table-wrap">
        {!loaded ? (
          <Loader label="Loading accounts…" />
        ) : users.length === 0 ? (
          <div className="empty">No accounts yet.</div>
        ) : (
          <table className="data wide">
            <thead>
              <tr><th>Person</th><th>Role</th><th>Email</th><th>Can reach</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const list = granted(u);
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={avatar(32)}>{u.initials}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          {u.id === user?.id && <div style={{ fontSize: 11, color: 'var(--faint)' }}>That&rsquo;s you</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.superAdmin
                        ? <span className="pill pill-blue">Super admin</span>
                        : <span style={{ color: 'var(--muted)' }}>{u.role}</span>}
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{u.email}</td>
                    <td style={{ maxWidth: 320 }}>
                      {u.superAdmin ? (
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Everything, including deleting records</span>
                      ) : list.length === 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--faint)' }}>Nothing yet</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {list.map((g) => <span key={g.key} className="pill pill-blue">{g.label}</span>)}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(u)} className="btn btn-ghost btn-sm">Edit access</button>
                        {u.id !== user?.id && (
                          <button onClick={() => { setConfirm(u); setError(''); }} className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--red)' }}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 12, maxWidth: 680 }}>
        A tick opens the matching page in the sidebar and allows the same requests behind it.
        Deleting drugs and cost entries is not on the list — it stays with the super admin.
      </div>

      {form && (
        <div className="overlay">
          <div className="modal modal-lg">
            <h2>{editing ? 'Edit access' : 'Add user'}</h2>
            <div className="form-grid">
              <div className="form-row">
                <input value={form.name} onChange={set('name')} placeholder="Full name" className="field" />
                <input value={form.email} onChange={set('email')} placeholder="Email address" type="email"
                  autoComplete="off" className="field" />
              </div>
              <div className="form-row">
                <select value={form.role} onChange={set('role')} className="field" disabled={form.superAdmin}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
                <input value={form.password} onChange={set('password')} type="password" autoComplete="new-password"
                  placeholder={editing ? 'New password (leave blank to keep)' : 'Password (min 8 characters)'}
                  className="field" />
              </div>

              <label className="tick" style={{ background: 'var(--blue-soft)', borderRadius: 12, padding: '12px 14px' }}>
                <input type="checkbox" checked={form.superAdmin}
                  onChange={() => setForm((f) => ({ ...f, superAdmin: !f.superAdmin }))} />
                <span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Super admin</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>
                    Every screen, plus adding users and deleting records. Overrides the ticks below.
                  </span>
                </span>
              </label>

              {!form.superAdmin && (
                <div>
                  <div className="field-label" style={{ marginTop: 4 }}>Can reach</div>
                  <div className="tick-grid">
                    {GRANTABLE.map((g) => (
                      <label key={g.key} className={`tick${g.kind === 'action' ? ' tick-sub' : ''}`}>
                        <input type="checkbox" checked={!!form.perms[g.key]} onChange={() => toggle(g.key)} />
                        <span>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{g.label}</span>
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{g.hint}</span>
                          {/* Editing drugs is only reachable from a page the account can open. */}
                          {g.needs && form.perms[g.key] && !form.perms[g.needs] && (
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>
                              Tick Inventory too, or there is no page to do it on.
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {error && <div className="banner banner-error">{error}</div>}
            </div>
            <div className="modal-actions">
              <button onClick={() => { setForm(null); setEditing(null); setError(''); }} className="btn btn-cancel">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn btn-primary">
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="overlay">
          <div className="modal modal-sm">
            <h2>Delete {confirm.name}?</h2>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              They will not be able to sign in again. Sales and entries they recorded stay on file
              under their name.
            </div>
            <div className="modal-actions">
              <button onClick={() => setConfirm(null)} className="btn btn-cancel">Keep account</button>
              <button onClick={remove} disabled={busy} className="btn btn-primary" style={{ background: 'var(--red)' }}>
                {busy ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
