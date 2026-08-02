'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, dateStr } from '@/lib/format';
import { EXPENSE_CATEGORIES } from '@/lib/labels';
import { C } from '@/lib/ui';

const INCOME_CATEGORIES = ['Sales', 'Credit repayment', 'Other'];
const blankEntry = () => ({ type: 'Income', category: 'Other', desc: '', amount: '' });

export default function FinancePage() {
  const { settings, L } = useApp();
  const fmt = makeFmt(settings.currency);
  const [data, setData] = useState(null);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(blankEntry());

  // The two entry types have different category lists, so switching resets the
  // choice rather than carrying e.g. "Rent" over to an income entry.
  const setType = (type) => setForm((f) => ({ ...f, type, category: type === 'Expense' ? 'Other' : 'Sales' }));

  const load = () => api('/transactions').then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api('/transactions', { method: 'POST', body: form });
      setShow(false);
      setForm(blankEntry());
      load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function settle(id) {
    setError('');
    try { await api(`/customers/${id}/settle`, { method: 'POST' }); load(); }
    catch (e) { setError(e.message); }
  }

  async function paySupplier(row) {
    setError('');
    try { await api(`/suppliers/${row.id}/pay`, { method: 'POST', body: { amount: row.amount } }); load(); }
    catch (e) { setError(e.message); }
  }

  const typeBtn = (active) => ({
    flex: 1, height: 34, borderRadius: 999, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
    background: active ? C.primary : 'transparent', color: active ? '#FFFFFF' : C.muted
  });

  const receivables = data?.receivables || [];
  const payables = data?.payables || [];

  return (
    <>
      <div className="page-head">
        <h1>{L.fin}</h1>
        <button onClick={() => { setForm(blankEntry()); setError(''); setShow(true); }} className="btn btn-primary">
          + Record entry
        </button>
      </div>

      {error && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="grid-5" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="label">Cash in hand</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(data?.cash || 0)}</div>
        </div>
        <div className="card">
          <div className="label">Income · 30d</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--green)' }}>{fmt(data?.inc30 || 0)}</div>
        </div>
        <div className="card">
          <div className="label">Expenses · 30d</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--red)' }}>{fmt(data?.exp30 || 0)}</div>
        </div>
        <div className="card">
          <div className="label">Receivable</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(receivables.reduce((t, r) => t + r.amount, 0))}</div>
          <div className="stat-sub">Customer credit (قرض)</div>
        </div>
        <div className="card">
          <div className="label">Payable</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(payables.reduce((t, r) => t + r.amount, 0))}</div>
          <div className="stat-sub">Owed to suppliers</div>
        </div>
      </div>

      <div className="grid-main-side">
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Cash book — income &amp; expenses</div>
          <div className="table-wrap" style={{ border: 'none' }}>
            {!data?.transactions?.length ? (
              <div className="empty">No entries yet.</div>
            ) : (
              <table className="data narrow" style={{ minWidth: 560 }}>
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th className="num">Amount</th></tr>
                </thead>
                <tbody>
                  {data.transactions.map((x) => (
                    <tr key={x._id}>
                      <td style={{ color: 'var(--muted)' }}>{dateStr(x.t)}</td>
                      <td>{x.desc}</td>
                      <td style={{ color: 'var(--muted)' }}>{x.category || '—'}</td>
                      <td><span className={`pill ${x.type === 'Income' ? 'pill-green' : 'pill-red'}`}>{x.type}</span></td>
                      <td className="num" style={{ fontWeight: 600, color: x.type === 'Income' ? 'var(--green)' : 'var(--red)' }}>
                        {x.type === 'Income' ? '+' : '−'}{fmt(x.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Accounts receivable</div>
            {receivables.length === 0 && <div style={{ fontSize: 13, color: 'var(--faint)', padding: '8px 0' }}>Nothing owed to you.</div>}
            {receivables.map((r) => (
              <div key={r.id} className="list-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.sub}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }} className="tnum">{fmt(r.amount)}</div>
                <button onClick={() => settle(r.id)} className="btn btn-ghost btn-sm">Settle</button>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Accounts payable</div>
            {payables.length === 0 && <div style={{ fontSize: 13, color: 'var(--faint)', padding: '8px 0' }}>You owe nothing to suppliers.</div>}
            {payables.map((r) => (
              <div key={r.id} className="list-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.sub}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }} className="tnum">{fmt(r.amount)}</div>
                <button onClick={() => paySupplier(r)} className="btn btn-ghost btn-sm">Pay</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {show && (
        <div className="overlay">
          <div className="modal modal-sm">
            <h2>Record entry</h2>
            <div className="form-grid">
              <div style={{ display: 'flex', background: 'var(--blue-soft)', borderRadius: 999, padding: 4 }}>
                <button onClick={() => setType('Income')} style={typeBtn(form.type === 'Income')}>Income</button>
                <button onClick={() => setType('Expense')} style={typeBtn(form.type === 'Expense')}>Expense</button>
              </div>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="field">
                {(form.type === 'Expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                placeholder="Description, e.g. Shop rent" className="field" />
              <input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Amount" type="number" min="0" className="field" />
              {error && <div className="banner banner-error">{error}</div>}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShow(false)} className="btn btn-cancel">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save entry'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
