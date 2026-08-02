'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, fmtK, dateStr } from '@/lib/format';
import { EXPENSE_CATEGORIES, STOCK_CATEGORY } from '@/lib/labels';

const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ category: 'Rent', desc: '', amount: '', t: today() });

// Entries from before the costs screen carry no `auto` flag; their description is
// what marks them as written by a purchase or a supplier payment.
const LEGACY_AUTO = /^(PO-\d+ payment —|Supplier payment —)/i;
const isAuto = (r) => !!r.auto || LEGACY_AUTO.test(r.desc || '');

const FILTERS = [['all', 'All costs'], ['running', 'Running costs'], ['stock', 'Stock purchases']];

export default function ExpensesPage() {
  const { settings, L } = useApp();
  const fmt = makeFmt(settings.currency);
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/expenses').then(setData).catch((e) => setError(e.message)).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api('/expenses', { method: 'POST', body: form });
      setShow(false);
      setForm(blank());
      load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function remove(row) {
    setError('');
    try { await api(`/expenses/${row._id}`, { method: 'DELETE' }); load(); }
    catch (e) { setError(e.message); }
  }

  const running = data?.running || {};
  const stock = data?.stock || {};
  const delta = running.prevMonth ? Math.round((running.month - running.prevMonth) / running.prevMonth * 100) : null;

  const trend = data?.trend || [];
  const maxBar = Math.max(1, ...trend.map((b) => b.running + b.stock));

  const q = search.trim().toLowerCase();
  const rows = (data?.rows || [])
    .filter((r) => filter === 'all' || (filter === 'stock' ? r.category === STOCK_CATEGORY : r.category !== STOCK_CATEGORY))
    .filter((r) => !q || [r.desc, r.category].some((v) => String(v || '').toLowerCase().includes(q)));

  return (
    <>
      <div className="page-head">
        <h1>{L.exp}</h1>
        <button onClick={() => { setForm(blank()); setError(''); setShow(true); }} className="btn btn-primary">
          + Record cost
        </button>
      </div>

      {error && !show && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="label">Running costs · this month</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--red)' }}>{fmt(running.month || 0)}</div>
          <div className="stat-sub" style={{ color: delta === null ? 'var(--muted)' : delta > 0 ? 'var(--red)' : 'var(--green)' }}>
            {delta === null ? 'No costs last month' : `${delta > 0 ? '+' : ''}${delta}% vs last month`}
          </div>
        </div>
        <div className="card">
          <div className="label">Running costs · last month</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(running.prevMonth || 0)}</div>
          <div className="stat-sub">Rent, salaries, bills</div>
        </div>
        <div className="card">
          <div className="label">Stock bought · this month</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(stock.month || 0)}</div>
          <div className="stat-sub">Purchases and supplier payments</div>
        </div>
        <div className="card">
          <div className="label">Spent this year</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt((running.ytd || 0) + (stock.ytd || 0))}</div>
          <div className="stat-sub">{fmt(running.ytd || 0)} running · {fmt(stock.ytd || 0)} stock</div>
        </div>
      </div>

      <div className="grid-main-side" style={{ marginBottom: 20 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Spending by month</div>
          {!trend.some((b) => b.running || b.stock) ? (
            <div className="empty">Nothing recorded yet.</div>
          ) : (
            <>
              <div className="bar-chart">
                {trend.map((b, i) => (
                  <div key={b.label + i} className="bar-col"
                    title={`${b.label} — ${fmt(b.running)} running, ${fmt(b.stock)} stock`}>
                    <div className="bar-value">{b.running + b.stock > 0 ? fmtK(b.running + b.stock) : ''}</div>
                    <div style={{ width: '100%', maxWidth: 44, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                      height: `${Math.max(2, Math.round((b.running + b.stock) / maxBar * 100))}%` }}>
                      <div style={{ flex: b.stock, background: '#B9D3E2', borderRadius: '6px 6px 0 0' }}></div>
                      <div style={{ flex: b.running, background: 'var(--red)', borderRadius: b.stock ? 0 : '6px 6px 0 0' }}></div>
                    </div>
                    <div className="bar-label">{b.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--red)', marginRight: 6 }}></span>Running costs</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#B9D3E2', marginRight: 6 }}></span>Stock</span>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>This month by category</div>
          {!data?.byCategory?.length && (
            <div style={{ fontSize: 13, color: 'var(--faint)' }}>No running costs recorded this month.</div>
          )}
          {(data?.byCategory || []).map((c) => (
            <div key={c.name} style={{ marginBottom: 12 }}>
              <div className="row-between" style={{ fontSize: 13, marginBottom: 5 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ color: 'var(--muted)' }} className="tnum">{fmt(c.amount)} · {c.pct}%</div>
              </div>
              <div className="meter"><div style={{ width: `${c.pct}%` }}></div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="row-between" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="segment">
          {FILTERS.map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} className={filter === k ? 'on' : ''}>{label}</button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by description or category…"
          className="field" style={{ maxWidth: 320 }} />
      </div>

      <div className="table-wrap">
        {loaded && !(data?.rows || []).length ? (
          <div className="empty">No costs recorded yet. Add the rent, salaries and bills the pharmacy pays.</div>
        ) : rows.length === 0 ? (
          <div className="empty">No cost matches this filter.</div>
        ) : (
          <table className="data narrow" style={{ minWidth: 700 }}>
            <thead>
              <tr><th>Date</th><th>Category</th><th>Description</th><th>Recorded by</th><th className="num">Amount</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td style={{ color: 'var(--muted)' }}>{dateStr(r.t)}</td>
                  <td>
                    <span className={`pill ${r.category === STOCK_CATEGORY ? 'pill-blue' : 'pill-amber'}`}>{r.category}</span>
                  </td>
                  <td>{r.desc}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.recordedBy || '—'}</td>
                  <td className="num" style={{ fontWeight: 600, color: 'var(--red)' }}>−{fmt(r.amount)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {isAuto(r) ? (
                      <span style={{ fontSize: 11, color: 'var(--faint)' }}>Automatic</span>
                    ) : (
                      <button onClick={() => remove(r)} className="btn btn-ghost btn-sm">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 12, maxWidth: 640 }}>
        Every cost here is the same entry the Finance cash book shows. Purchases and supplier
        payments book themselves as stock and can only be reversed on those screens.
      </div>

      {show && (
        <div className="overlay">
          <div className="modal modal-sm">
            <h2>Record cost</h2>
            <div className="form-grid">
              <div>
                <div className="field-label">Category</div>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="field">
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                placeholder="Description, e.g. Shop rent for Asad" className="field" />
              <div className="form-row">
                <input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="Amount" type="number" min="0" className="field" />
                <input value={form.t} onChange={(e) => setForm((f) => ({ ...f, t: e.target.value }))}
                  type="date" max={today()} className="field" />
              </div>
              {error && <div className="banner banner-error">{error}</div>}
            </div>
            <div className="modal-actions">
              <button onClick={() => { setShow(false); setError(''); }} className="btn btn-cancel">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save cost'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
