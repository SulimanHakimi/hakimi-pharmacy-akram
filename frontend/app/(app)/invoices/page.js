'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, dateStr } from '@/lib/format';
import InvoiceModal from '@/components/InvoiceModal';

export default function InvoicesPage() {
  const { settings, L, user } = useApp();
  const fmt = makeFmt(settings.currency);
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => { api('/invoices').then(setRows).catch(() => {}).finally(() => setLoaded(true)); }, []);

  const q = search.trim().toLowerCase();
  const shown = q ? rows.filter((r) => [r.no, r.customer, r.phone].some((v) => String(v || '').toLowerCase().includes(q))) : rows;

  // Margin on a sale is only meaningful to someone who can see cost prices.
  const showProfit = !!user?.perms?.ana || !!user?.perms?.fin || !!user?.perms?.inv;

  return (
    <>
      <div className="page-head">
        <h1>{L.sales}</h1>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by invoice number, customer or phone…"
        className="field" style={{ maxWidth: 360, marginBottom: 14 }} />

      <div className="table-wrap">
        {loaded && rows.length === 0 ? (
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
              {shown.map((r) => (
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
                  <td><span className={`pill ${r.payment === 'Credit' ? 'pill-amber' : 'pill-green'}`}>{r.payment || 'Cash'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => setOpen(r)} className="btn btn-ghost btn-sm">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <InvoiceModal invoice={open} onClose={() => setOpen(null)} />}
    </>
  );
}
