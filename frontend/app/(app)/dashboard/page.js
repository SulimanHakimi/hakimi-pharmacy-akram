'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, dateStr, expStr, todayStr } from '@/lib/format';
import InvoiceModal from '@/components/InvoiceModal';
import Loader from '@/components/Loader';

export default function DashboardPage() {
  const { settings, L } = useApp();
  const fmt = makeFmt(settings.currency);
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api('/analytics/dashboard').then(setStats).catch(() => {});
    api('/invoices?limit=5').then(setInvoices).catch(() => {});
  }, []);

  const head = (
    <div className="page-head">
      <h1>{L.dash}</h1>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{todayStr()}</div>
    </div>
  );

  // Zeroes everywhere read as a day with no sales rather than as a page that has
  // not finished loading, so nothing is shown until the figures are in.
  if (!stats) return <>{head}<Loader label="Loading today’s figures…" pad={80} /></>;

  return (
    <>
      {head}

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="label">Today&apos;s sales</div>
          <div className="stat-value">{fmt(stats?.sales || 0)}</div>
          <div className="stat-sub">{stats?.invoiceCount || 0} invoices today</div>
        </div>
        <div className="card">
          <div className="label">Today&apos;s profit</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{fmt(stats?.profit || 0)}</div>
          <div className="stat-sub">Sell price − buy price, less discounts</div>
        </div>
        <div className="card">
          <div className="label">Low stock</div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>{stats?.lowCount ?? 0}</div>
          <div className="stat-sub">Below the reorder level of {settings.lowStockThreshold}</div>
        </div>
        <div className="card">
          <div className="label">Expiring soon</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{stats?.expCount ?? 0}</div>
          <div className="stat-sub">Within the next 3 months</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Low stock — reorder</div>
          {!stats?.lowList?.length && <div style={{ fontSize: 13, color: 'var(--faint)', padding: '12px 0' }}>Nothing below the reorder level.</div>}
          {(stats?.lowList || []).map((d) => (
            <div key={d.name} className="list-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.supplier}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }} className="tnum">{d.stock} left</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Expiring soon</div>
          {!stats?.expList?.length && <div style={{ fontSize: 13, color: 'var(--faint)', padding: '12px 0' }}>Nothing expiring in the next 3 months.</div>}
          {(stats?.expList || []).map((d) => (
            <div key={d.name} className="list-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.stock} in stock</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>{expStr(d.expiry)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Recent invoices</div>
      <div className="table-wrap">
        {invoices.length === 0 ? (
          <div className="empty">No sales recorded yet.</div>
        ) : (
          <table className="data narrow">
            <thead>
              <tr>
                <th>Invoice</th><th>Date</th><th>Customer</th>
                <th className="num">Items</th><th className="num">Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.no}</td>
                  <td style={{ color: 'var(--muted)' }}>{dateStr(r.date)}</td>
                  <td>{r.customer}</td>
                  <td className="num">{r.items.length}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmt(r.total)}</td>
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
