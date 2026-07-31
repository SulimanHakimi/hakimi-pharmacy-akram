'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, expStr, monthsTo } from '@/lib/format';
import { stockStatus } from '@/lib/ui';

const CATEGORIES = ['Pain Relief', 'Antibiotic', 'Gastro', 'Diabetes', 'Allergy', 'Cardiac', 'Respiratory', 'Supplement', 'Topical', 'Rehydration', 'Other'];
const EMPTY = { name: '', category: CATEGORIES[0], supplier: '', buy: '', sell: '', stock: '', expiry: '', batch: '', barcode: '' };

export default function InventoryPage() {
  const { settings, L } = useApp();
  const fmt = makeFmt(settings.currency);
  const [drugs, setDrugs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = () => api('/drugs').then(setDrugs).catch(() => {}).finally(() => setLoaded(true));
  useEffect(() => {
    load();
    api('/suppliers').then(setSuppliers).catch(() => {});
  }, []);

  const q = search.trim().toLowerCase();
  const rows = q
    ? drugs.filter((d) => [d.name, d.category, d.supplier, d.barcode].some((v) => String(v || '').toLowerCase().includes(q)))
    : drugs;

  function openForm() {
    setForm({ ...EMPTY, supplier: suppliers[0]?.name || '' });
    setError('');
    setShow(true);
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api('/drugs', { method: 'POST', body: form });
      setShow(false);
      load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const margin = (d) => d.buy > 0 ? Math.round((d.sell - d.buy) / d.buy * 100) + '%' : '—';

  return (
    <>
      <div className="page-head">
        <h1>{L.inv}</h1>
        <button onClick={openForm} className="btn btn-primary">+ Add drug</button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, category, supplier or barcode…"
        className="field" style={{ maxWidth: 360, marginBottom: 14 }} />

      <div className="table-wrap">
        {loaded && drugs.length === 0 ? (
          <div className="empty">
            No drugs yet.{suppliers.length === 0 && ' Add a supplier first, then'} use <strong>Add drug</strong> to build your inventory.
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">No drug matches your search.</div>
        ) : (
          <table className="data wide">
            <thead>
              <tr>
                <th>Drug</th><th>Category</th><th>Supplier</th>
                <th className="num">Buy</th><th className="num">Sell</th><th className="num">Margin</th>
                <th className="num">Stock</th><th>Expiry</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const s = stockStatus(d, settings.lowStockThreshold, monthsTo(d.expiry));
                return (
                  <tr key={d._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      {(d.batch || d.barcode) && (
                        <div style={{ fontSize: 11, color: 'var(--faint)' }} className="tnum">
                          {[d.batch && `Batch ${d.batch}`, d.barcode].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{d.category}</td>
                    <td style={{ color: 'var(--muted)' }}>{d.supplier}</td>
                    <td className="num">{fmt(d.buy)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(d.sell)}</td>
                    <td className="num" style={{ color: 'var(--green)' }}>{margin(d)}</td>
                    <td className="num">{d.stock}</td>
                    <td style={{ color: 'var(--muted)' }}>{expStr(d.expiry)}</td>
                    <td><span className={`pill ${s.cls}`}>{s.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {show && (
        <div className="overlay">
          <div className="modal modal-md">
            <h2>Add drug</h2>
            <div className="form-grid">
              <input value={form.name} onChange={set('name')} placeholder="Drug name, e.g. Paracetamol 500mg Tab" className="field" />
              <div className="form-row">
                <select value={form.category} onChange={set('category')} className="field">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select value={form.supplier} onChange={set('supplier')} className="field">
                  {suppliers.length === 0 && <option value="">No suppliers yet</option>}
                  {suppliers.map((s) => <option key={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <input value={form.buy} onChange={set('buy')} placeholder="Buy price" type="number" min="0" className="field" />
                <input value={form.sell} onChange={set('sell')} placeholder="Sell price" type="number" min="0" className="field" />
              </div>
              <div className="form-row">
                <input value={form.stock} onChange={set('stock')} placeholder="Opening stock" type="number" min="0" className="field" />
                <input value={form.expiry} onChange={set('expiry')} type="month" className="field" title="Expiry month" />
              </div>
              <div className="form-row">
                <input value={form.batch} onChange={set('batch')} placeholder="Batch number (optional)" className="field" />
                <input value={form.barcode} onChange={set('barcode')} placeholder="Barcode (optional)" className="field" />
              </div>
              {error && <div className="banner banner-error">{error}</div>}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShow(false)} className="btn btn-cancel">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save drug'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
