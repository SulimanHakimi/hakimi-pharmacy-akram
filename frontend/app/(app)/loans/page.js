'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, dateStr, dm } from '@/lib/format';
import InvoiceModal from '@/components/InvoiceModal';

const TABS = [
  ['debtors', 'Outstanding'],
  ['sales', 'Loan sales'],
  ['repayments', 'Repayments']
];

export default function LoansPage() {
  const { settings, L } = useApp();
  const fmt = makeFmt(settings.currency);
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('debtors');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const [collect, setCollect] = useState(null);      // debtor being paid
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/loans').then(setData).catch((e) => setError(e.message)).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  async function submitCollect() {
    if (busy || !collect) return;
    const value = +amount;
    if (!(value > 0)) { setError('Enter an amount to collect'); return; }
    if (value > collect.credit) { setError(`That is more than the ${fmt(collect.credit)} outstanding`); return; }
    setBusy(true);
    setError('');
    try {
      await api(`/customers/${collect.id}/settle`, { method: 'POST', body: { amount: value } });
      setCollect(null);
      setAmount('');
      load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  const q = search.trim().toLowerCase();
  const match = (...vals) => !q || vals.some((v) => String(v || '').toLowerCase().includes(q));

  const debtors = (data?.debtors || []).filter((d) => match(d.name, d.phone));
  const sales = (data?.sales || []).filter((s) => match(s.no, s.customer, s.phone));
  const repayments = (data?.repayments || []).filter((r) => match(r.desc));

  return (
    <>
      <div className="page-head">
        <h1>{L.loans}</h1>
        <button onClick={() => router.push('/pos')} className="btn btn-primary">+ New loan sale</button>
      </div>

      {error && !collect && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="label">Outstanding</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--amber)' }}>{fmt(data?.outstanding || 0)}</div>
          <div className="stat-sub">{(data?.debtors || []).length} customer(s) on نسیه</div>
        </div>
        <div className="card">
          <div className="label">Overdue · 30d+</div>
          <div className="stat-value" style={{ fontSize: 20, color: data?.overdue ? 'var(--red)' : 'var(--text)' }}>
            {fmt(data?.overdue || 0)}
          </div>
          <div className="stat-sub">Oldest loan older than a month</div>
        </div>
        <div className="card">
          <div className="label">Loaned this month</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(data?.loanedMonth || 0)}</div>
          <div className="stat-sub">Sold on credit</div>
        </div>
        <div className="card">
          <div className="label">Collected this month</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--green)' }}>{fmt(data?.repaidMonth || 0)}</div>
          <div className="stat-sub">Repayments received</div>
        </div>
      </div>

      <div className="row-between" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="segment">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={tab === k ? 'on' : ''}>{label}</button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer, phone or invoice…"
          className="field" style={{ maxWidth: 320 }} />
      </div>

      {tab === 'debtors' && (
        <div className="table-wrap">
          {loaded && !(data?.debtors || []).length ? (
            <div className="empty">Nobody owes you anything. Credit sales made at the counter show up here.</div>
          ) : debtors.length === 0 ? (
            <div className="empty">No customer matches your search.</div>
          ) : (
            <table className="data narrow">
              <thead>
                <tr>
                  <th>Customer</th><th>Phone</th><th>Oldest loan</th>
                  <th className="num">Loan sales</th><th className="num">Loaned</th><th className="num">Still owed</th>
                  <th>Age</th><th></th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td style={{ color: 'var(--muted)' }} className="tnum">{d.phone || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{d.oldestLoan ? dm(d.oldestLoan) : '—'}</td>
                    <td className="num">{d.sales}</td>
                    <td className="num">{fmt(d.loaned)}</td>
                    <td className="num" style={{ fontWeight: 600, color: 'var(--amber)' }}>{fmt(d.credit)}</td>
                    <td>
                      {d.daysOld === null ? <span className="pill pill-blue">No sale on file</span>
                        : d.daysOld > 60 ? <span className="pill pill-red">{d.daysOld} days</span>
                        : d.daysOld > 30 ? <span className="pill pill-amber">{d.daysOld} days</span>
                        : <span className="pill pill-green">{d.daysOld} days</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => { setCollect(d); setAmount(String(Math.round(d.credit))); setError(''); }}
                        className="btn btn-ghost btn-sm">Collect</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'sales' && (
        <div className="table-wrap">
          {loaded && !(data?.sales || []).length ? (
            <div className="empty">No loan sales yet. Choose نسیه as the payment method at the counter.</div>
          ) : sales.length === 0 ? (
            <div className="empty">No loan sale matches your search.</div>
          ) : (
            <table className="data narrow">
              <thead>
                <tr>
                  <th>Invoice</th><th>Date</th><th>Customer</th><th>Phone</th>
                  <th className="num">Items</th><th className="num">Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{s.no}</td>
                    <td style={{ color: 'var(--muted)' }}>{dateStr(s.date)}</td>
                    <td>{s.customer}</td>
                    <td style={{ color: 'var(--muted)' }} className="tnum">{s.phone || '—'}</td>
                    <td className="num">{s.items.length}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(s.total)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => setOpen(s)} className="btn btn-ghost btn-sm">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'repayments' && (
        <div className="table-wrap">
          {loaded && !(data?.repayments || []).length ? (
            <div className="empty">No repayments collected yet.</div>
          ) : repayments.length === 0 ? (
            <div className="empty">No repayment matches your search.</div>
          ) : (
            <table className="data narrow" style={{ minWidth: 520 }}>
              <thead>
                <tr><th>Date</th><th>Description</th><th>Taken by</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                {repayments.map((r) => (
                  <tr key={r._id}>
                    <td style={{ color: 'var(--muted)' }}>{dateStr(r.t)}</td>
                    <td>{r.desc}</td>
                    <td style={{ color: 'var(--muted)' }}>{r.recordedBy || '—'}</td>
                    <td className="num" style={{ fontWeight: 600, color: 'var(--green)' }}>+{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 12, maxWidth: 640 }}>
        A repayment clears the customer&rsquo;s balance rather than one particular invoice, so amounts
        collected are not tied back to a single loan sale.
      </div>

      {collect && (
        <div className="overlay">
          <div className="modal modal-sm">
            <h2>Collect from {collect.name}</h2>
            <div className="form-grid">
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Outstanding <strong style={{ color: 'var(--amber)' }}>{fmt(collect.credit)}</strong>
                {collect.phone ? ` · ${collect.phone}` : ''}
              </div>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount collected"
                type="number" min="0" className="field" />
              <button onClick={() => setAmount(String(Math.round(collect.credit)))} className="btn btn-ghost btn-sm">
                Pay the full {fmt(collect.credit)}
              </button>
              {error && <div className="banner banner-error">{error}</div>}
            </div>
            <div className="modal-actions">
              <button onClick={() => { setCollect(null); setError(''); }} className="btn btn-cancel">Cancel</button>
              <button onClick={submitCollect} disabled={busy} className="btn btn-primary">
                {busy ? 'Saving…' : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {open && <InvoiceModal invoice={open} onClose={() => setOpen(null)} />}
    </>
  );
}
