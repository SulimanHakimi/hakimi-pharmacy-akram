'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, dateStr, dm } from '@/lib/format';
import { invoiceSplit } from '@/lib/ui';
import InvoiceModal from '@/components/InvoiceModal';
import Loader from '@/components/Loader';

const TABS = [
  ['debtors', 'Outstanding'],
  ['sales', 'Loan sales'],
  ['repayments', 'Repayments']
];

export default function LoansPage() {
  const { settings, L, go } = useApp();
  const fmt = makeFmt(settings.currency);
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('debtors');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const [collect, setCollect] = useState(null);      // debtor being paid
  const [payOff, setPayOff] = useState(null);        // single loan sale being paid
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/loans').then(setData).catch((e) => setError(e.message)).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  // Collect against the customer's whole balance, without naming a sale.
  async function submitCollect() {
    if (busy || !collect) return;
    const value = +amount;
    if (!(value > 0)) { setError('Enter an amount to collect'); return; }
    if (value > collect.credit) { setError(`That is more than the ${fmt(collect.credit)} outstanding`); return; }
    setBusy(true);
    setError('');
    try {
      await api(`/customers/${collect.id}/settle`, { method: 'POST', body: { amount: value } });
      setNotice(value >= collect.credit
        ? `${collect.name} is settled up — balance is now zero.`
        : `${fmt(value)} collected from ${collect.name}.`);
      setCollect(null);
      setAmount('');
      load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  // Collect against one particular loan sale.
  async function submitPayOff() {
    if (busy || !payOff) return;
    const value = +amount;
    if (!(value > 0)) { setError('Enter an amount'); return; }
    if (value > payOff.owed) { setError(`That is more than the ${fmt(payOff.owed)} still owed on ${payOff.no}`); return; }
    setBusy(true);
    setError('');
    try {
      const res = await api(`/invoices/${payOff._id}/settle`, { method: 'POST', body: { amount: value } });
      setNotice(res.cleared
        ? `${payOff.no} is paid in full.`
        : `${fmt(value)} taken off ${payOff.no} — ${fmt(res.owed)} still owed.`);
      setPayOff(null);
      setAmount('');
      load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  const q = search.trim().toLowerCase();
  const match = (...vals) => !q || vals.some((v) => String(v || '').toLowerCase().includes(q));

  const debtors = (data?.debtors || []).filter((d) => match(d.name));
  const sales = (data?.sales || []).filter((s) => match(s.no, s.customer));
  const repayments = (data?.repayments || []).filter((r) => match(r.desc));
  const modalOpen = collect || payOff;

  return (
    <>
      <div className="page-head">
        <h1>{L.loans}</h1>
        <button onClick={() => go('/pos')} className="btn btn-primary">+ New loan sale</button>
      </div>

      {notice && <div className="banner banner-ok" style={{ marginBottom: 14 }}>{notice}</div>}
      {error && !modalOpen && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="label">Outstanding</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--amber)' }}>{fmt(data?.outstanding || 0)}</div>
          <div className="stat-sub">{(data?.debtors || []).length} customer(s) on قرض</div>
        </div>
        <div className="card">
          <div className="label">Overdue · 30d+</div>
          <div className="stat-value" style={{ fontSize: 20, color: data?.overdue ? 'var(--red)' : 'var(--text)' }}>
            {fmt(data?.overdue || 0)}
          </div>
          <div className="stat-sub">Oldest unpaid loan older than a month</div>
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
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer or invoice…"
          className="field" style={{ maxWidth: 320 }} />
      </div>

      {tab === 'debtors' && (
        <div className="table-wrap">
          {!loaded ? (
            <Loader label="Loading loans…" />
          ) : !(data?.debtors || []).length ? (
            <div className="empty">Nobody owes you anything. Credit sales made at the counter show up here.</div>
          ) : debtors.length === 0 ? (
            <div className="empty">No customer matches your search.</div>
          ) : (
            <table className="data narrow">
              <thead>
                <tr>
                  <th>Customer</th><th>Oldest unpaid</th>
                  <th className="num">Loan sales</th><th className="num">Loaned</th><th className="num">Still owed</th>
                  <th>Age</th><th></th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td style={{ color: 'var(--muted)' }}>{d.oldestLoan ? dm(d.oldestLoan) : '—'}</td>
                    <td className="num">{d.openSales ?? d.sales}</td>
                    <td className="num">{fmt(d.loaned)}</td>
                    <td className="num" style={{ fontWeight: 600, color: 'var(--amber)' }}>{fmt(d.credit)}</td>
                    <td>
                      {d.daysOld === null ? <span className="pill pill-blue">No sale on file</span>
                        : d.daysOld > 60 ? <span className="pill pill-red">{d.daysOld} days</span>
                        : d.daysOld > 30 ? <span className="pill pill-amber">{d.daysOld} days</span>
                        : <span className="pill pill-green">{d.daysOld} days</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => { setCollect(d); setAmount(String(Math.round(d.credit))); setError(''); setNotice(''); }}
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
          {!loaded ? (
            <Loader label="Loading loan sales…" />
          ) : !(data?.sales || []).length ? (
            <div className="empty">No loan sales yet. Choose <strong>قرض</strong> or <strong>Part</strong> as the payment method at the counter.</div>
          ) : sales.length === 0 ? (
            <div className="empty">No loan sale matches your search.</div>
          ) : (
            <table className="data narrow" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Invoice</th><th>Date</th><th>Customer</th>
                  <th className="num">Bill total</th><th className="num">Paid then</th>
                  <th className="num">Put on قرض</th><th className="num">Still owed</th><th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const { paid, due } = invoiceSplit(s);
                  const owed = s.owed ?? due;
                  const collected = due - owed;
                  return (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{s.no}</td>
                      <td style={{ color: 'var(--muted)' }}>{dateStr(s.date)}</td>
                      <td>{s.customer}</td>
                      <td className="num">{fmt(s.total)}</td>
                      <td className="num" style={{ color: paid > 0 ? 'var(--green)' : 'var(--faint)' }}>
                        {paid > 0 ? fmt(paid) : '—'}
                      </td>
                      <td className="num">{fmt(due)}</td>
                      <td className="num">
                        {owed > 0 ? (
                          <span style={{ fontWeight: 600, color: 'var(--amber)' }}>{fmt(owed)}</span>
                        ) : (
                          <span className="pill pill-green">Paid</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setOpen(s)} className="btn btn-ghost btn-sm">View</button>
                          {owed > 0 && (
                            <button
                              onClick={() => { setPayOff({ ...s, owed }); setAmount(String(Math.round(owed))); setError(''); setNotice(''); }}
                              className="btn btn-primary btn-sm">
                              {collected > 0 ? 'Pay rest' : 'Mark paid'}
                            </button>
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
      )}

      {tab === 'repayments' && (
        <div className="table-wrap">
          {!loaded ? (
            <Loader label="Loading repayments…" />
          ) : !(data?.repayments || []).length ? (
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

      <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 12, maxWidth: 680 }}>
        Paying from <strong>Loan sales</strong> settles that one invoice and takes the same amount off the
        customer&rsquo;s balance. Collecting from <strong>Outstanding</strong> is for when the customer just
        hands over money without naming a sale — it comes off their oldest unpaid sales first, so the two
        views never disagree.
      </div>

      {collect && (
        <div className="overlay">
          <div className="modal modal-sm">
            <h2>Collect from {collect.name}</h2>
            <div className="form-grid">
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Outstanding <strong style={{ color: 'var(--amber)' }}>{fmt(collect.credit)}</strong> across
                {' '}{collect.openSales ?? collect.sales} unpaid sale(s)
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

      {payOff && (
        <div className="overlay">
          <div className="modal modal-sm">
            <h2>Payment on {payOff.no}</h2>
            <div className="form-grid">
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {payOff.customer} · bill {fmt(payOff.total)} · still owed{' '}
                <strong style={{ color: 'var(--amber)' }}>{fmt(payOff.owed)}</strong>
              </div>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount paid"
                type="number" min="0" className="field" />
              <button onClick={() => setAmount(String(Math.round(payOff.owed)))} className="btn btn-ghost btn-sm">
                Paid in full — {fmt(payOff.owed)}
              </button>
              <div style={{ fontSize: 11, color: 'var(--faint)' }}>
                Goes into the cash book as a credit repayment and comes off {payOff.customer}&rsquo;s balance.
              </div>
              {error && <div className="banner banner-error">{error}</div>}
            </div>
            <div className="modal-actions">
              <button onClick={() => { setPayOff(null); setError(''); }} className="btn btn-cancel">Cancel</button>
              <button onClick={submitPayOff} disabled={busy} className="btn btn-primary">
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
