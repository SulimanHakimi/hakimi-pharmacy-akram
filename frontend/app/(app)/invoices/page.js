'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, dateStr } from '@/lib/format';
import { invoiceSplit } from '@/lib/ui';
import InvoiceModal from '@/components/InvoiceModal';
import RefundModal from '@/components/RefundModal';
import Loader from '@/components/Loader';

export default function InvoicesPage() {
  const { settings, L, user } = useApp();
  const fmt = makeFmt(settings.currency);
  const [rows, setRows] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('sales');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const [refunding, setRefunding] = useState(null);

  const load = () => Promise.all([
    api('/invoices').then(setRows).catch(() => {}),
    api('/returns').then((d) => setReturns(d.rows || [])).catch(() => {})
  ]).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase();
  const match = (...vals) => !q || vals.some((v) => String(v || '').toLowerCase().includes(q));
  const shown = rows.filter((r) => match(r.no, r.customer));
  const shownReturns = returns.filter((r) => match(r.rn, r.invoiceNo, r.customer));

  // Margin on a sale is only meaningful to someone who can see cost prices.
  const showProfit = !!user?.perms?.ana || !!user?.perms?.fin || !!user?.perms?.inv;

  // How much of each invoice has already come back, for the badge on the row.
  const refundedOn = {};
  for (const r of returns) refundedOn[r.invoiceNo] = (refundedOn[r.invoiceNo] || 0) + r.amount;

  return (
    <>
      <div className="page-head">
        <h1>{L.sales}</h1>
      </div>

      <div className="row-between" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="segment">
          <button onClick={() => setTab('sales')} className={tab === 'sales' ? 'on' : ''}>Sales</button>
          <button onClick={() => setTab('returns')} className={tab === 'returns' ? 'on' : ''}>
            Returns{returns.length ? ` (${returns.length})` : ''}
          </button>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice number or customer…" className="field" style={{ maxWidth: 340 }} />
      </div>

      {tab === 'sales' && (
        <div className="table-wrap">
          {!loaded ? (
            <Loader label="Loading invoices…" />
          ) : rows.length === 0 ? (
            <div className="empty">No invoices yet. Completed sales appear here.</div>
          ) : shown.length === 0 ? (
            <div className="empty">No invoice matches your search.</div>
          ) : (
            <table className="data narrow">
              <thead>
                <tr>
                  <th>Invoice</th><th>Date</th><th>Customer</th>
                  <th className="num">Items</th><th className="num">Total</th>
                  {showProfit && <th className="num">Profit</th>}
                  <th>Payment</th><th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const { due } = invoiceSplit(r);
                  const back = refundedOn[r.no] || 0;
                  return (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.no}</td>
                    <td style={{ color: 'var(--muted)' }}>{dateStr(r.date)}</td>
                    <td>{r.customer}</td>
                    <td className="num">{r.items.length}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(r.total)}</td>
                    {showProfit && (
                      <td className="num" style={{ color: 'var(--green)' }}>
                        {fmt(r.items.reduce((t, i) => t + (i.price - i.buy) * i.qty, 0) - (r.disc || 0))}
                      </td>
                    )}
                    <td>
                      <span className={`pill ${r.payment === 'Credit' ? 'pill-amber' : r.payment === 'Partial' ? 'pill-blue' : 'pill-green'}`}>
                        {r.payment || 'Cash'}
                      </span>
                      {r.payment === 'Partial' && (
                        <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 3 }} className="tnum">{fmt(due)} on قرض</div>
                      )}
                      {back > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }} className="tnum">−{fmt(back)} returned</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setOpen(r)} className="btn btn-ghost btn-sm">View</button>
                      <button onClick={() => setRefunding(r)} className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }}>Return</button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'returns' && (
        <div className="table-wrap">
          {!loaded ? (
            <Loader label="Loading returns…" />
          ) : returns.length === 0 ? (
            <div className="empty">
              Nothing has been returned. Use <strong>Return</strong> on a sale to take drugs back.
            </div>
          ) : shownReturns.length === 0 ? (
            <div className="empty">No return matches your search.</div>
          ) : (
            <table className="data narrow" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Return</th><th>Date</th><th>Invoice</th><th>Customer</th><th>Drugs</th>
                  <th className="num">Value</th><th className="num">Off قرض</th><th className="num">Cash back</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {shownReturns.map((r) => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.rn}</td>
                    <td style={{ color: 'var(--muted)' }}>{dateStr(r.date)}</td>
                    <td style={{ color: 'var(--muted)' }}>{r.invoiceNo}</td>
                    <td>{r.customer}</td>
                    <td style={{ fontSize: 12 }}>{r.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(r.amount)}</td>
                    <td className="num" style={{ color: r.creditCleared ? 'var(--amber)' : 'var(--faint)' }}>
                      {r.creditCleared ? fmt(r.creditCleared) : '—'}
                    </td>
                    <td className="num" style={{ color: r.refunded ? 'var(--red)' : 'var(--faint)' }}>
                      {r.refunded ? fmt(r.refunded) : '—'}
                    </td>
                    <td>
                      <span className={`pill ${r.restocked ? 'pill-green' : 'pill-red'}`}>
                        {r.restocked ? 'Back on shelf' : 'Written off'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {open && <InvoiceModal invoice={open} onClose={() => setOpen(null)} />}
      {refunding && (
        <RefundModal invoice={refunding} onClose={() => setRefunding(null)}
          onDone={() => { setRefunding(null); load(); }} />
      )}
    </>
  );
}
