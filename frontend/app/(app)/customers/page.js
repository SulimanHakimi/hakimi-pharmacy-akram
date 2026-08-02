'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, dateStr } from '@/lib/format';
import Loader from '@/components/Loader';

export default function CustomersPage() {
  const { settings, L } = useApp();
  const fmt = makeFmt(settings.currency);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [hist, setHist] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api('/customers').then(setCustomers).catch(() => {}).finally(() => setLoaded(true));
    api('/invoices').then(setInvoices).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  // Sales are tied to a customer by the name on the invoice — that is all the
  // counter records.
  const invoicesFor = useMemo(() => (c) => invoices.filter((i) => i.customer === c.name), [invoices]);

  async function settle(id) {
    setError('');
    try { await api(`/customers/${id}/settle`, { method: 'POST' }); load(); }
    catch (e) { setError(e.message); }
  }

  const q = search.trim().toLowerCase();
  const shown = q ? customers.filter((c) => String(c.name || '').toLowerCase().includes(q)) : customers;
  const histInvoices = hist ? invoicesFor(hist) : [];

  return (
    <>
      <div className="page-head">
        <h1>{L.cust}</h1>
      </div>

      {error && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…"
        className="field" style={{ maxWidth: 360, marginBottom: 14 }} />

      <div className="table-wrap">
        {!loaded ? (
          <Loader label="Loading customers…" />
        ) : customers.length === 0 ? (
          <div className="empty">
            No customers yet. They are created automatically when a sale is rung up under a name.
          </div>
        ) : shown.length === 0 ? (
          <div className="empty">No customer matches your search.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Customer</th><th>Since</th>
                <th className="num">Purchases</th><th className="num">Total spent</th><th className="num">Credit owed</th><th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const invs = invoicesFor(c);
                return (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ color: 'var(--muted)' }}>{c.since}</td>
                    <td className="num">{invs.length}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(invs.reduce((t, i) => t + i.total, 0))}</td>
                    <td className="num" style={{ fontWeight: 600, color: c.credit ? 'var(--red)' : 'var(--faint)' }}>
                      {c.credit ? fmt(c.credit) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => setHist(c)} className="btn btn-ghost btn-sm">History</button>
                        {c.credit > 0 && <button onClick={() => settle(c._id)} className="btn btn-primary btn-sm">Settle</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {hist && (
        <div className="overlay">
          <div className="modal modal-lg">
            <div className="row-between" style={{ alignItems: 'baseline', marginBottom: 4 }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{hist.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Customer since {hist.since || '—'}</div>
            </div>
            <div style={{ fontSize: 13, color: hist.credit ? 'var(--amber)' : 'var(--muted)', fontWeight: 600, marginBottom: 12 }}>
              {hist.credit ? `${fmt(hist.credit)} owed` : 'No credit owed'}
            </div>

            <div className="table-wrap" style={{ border: 'none' }}>
              {histInvoices.length === 0 ? (
                <div className="empty">No purchases recorded.</div>
              ) : (
                <table className="data narrow" style={{ minWidth: 480 }}>
                  <thead>
                    <tr><th>Invoice</th><th>Date</th><th>Items</th><th>Paid</th><th className="num">Total</th></tr>
                  </thead>
                  <tbody>
                    {histInvoices.map((r) => (
                      <tr key={r._id}>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.no}</td>
                        <td style={{ color: 'var(--muted)' }}>{dateStr(r.date)}</td>
                        <td>{r.items.map((x) => x.name.split(' ')[0]).join(', ')}</td>
                        <td style={{ color: 'var(--muted)' }}>{r.payment || 'Cash'}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{fmt(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={() => setHist(null)} className="btn btn-cancel">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
