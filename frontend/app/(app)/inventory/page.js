'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp, canDelete, canEditDrugs } from '@/lib/store';
import { makeFmt, expStr, monthsTo } from '@/lib/format';
import { stockStatus } from '@/lib/ui';
import Loader from '@/components/Loader';

const CATEGORIES = ['Pain Relief', 'Antibiotic', 'Gastro', 'Diabetes', 'Allergy', 'Cardiac', 'Respiratory', 'Supplement', 'Topical', 'Rehydration', 'Other'];
const EMPTY = { name: '', category: CATEGORIES[0], supplier: '', buy: '', sell: '', stock: '', expiry: '', batch: '', barcode: '' };

export default function InventoryPage() {
  const { settings, L, user } = useApp();
  const fmt = makeFmt(settings.currency);
  const mayEdit = canEditDrugs(user);
  const mayDelete = canDelete(user);
  const [drugs, setDrugs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);      // drug id when editing, null when adding
  const [confirm, setConfirm] = useState(null);      // drug queued for deletion
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

  function openAdd() {
    setForm({ ...EMPTY, supplier: suppliers[0]?.name || '' });
    setEditing(null);
    setError('');
    setShow(true);
  }

  function openEdit(d) {
    setForm({
      name: d.name, category: d.category, supplier: d.supplier,
      buy: String(d.buy ?? ''), sell: String(d.sell ?? ''), stock: String(d.stock ?? ''),
      expiry: d.expiry || '', batch: d.batch || '', barcode: d.barcode || ''
    });
    setEditing(d._id);
    setError('');
    setShow(true);
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (editing) await api(`/drugs/${editing}`, { method: 'PUT', body: form });
      else await api('/drugs', { method: 'POST', body: form });
      setShow(false);
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
      await api(`/drugs/${confirm._id}`, { method: 'DELETE' });
      setConfirm(null);
      load();
    } catch (e) { setError(e.message); setConfirm(null); }
    setBusy(false);
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const margin = (d) => d.buy > 0 ? Math.round((d.sell - d.buy) / d.buy * 100) + '%' : '—';
  const actions = mayEdit || mayDelete;

  return (
    <>
      <div className="page-head">
        <h1>{L.inv}</h1>
        {mayEdit && <button onClick={openAdd} className="btn btn-primary">+ Add drug</button>}
      </div>

      {error && !show && !confirm && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, category, supplier or barcode…"
        className="field" style={{ maxWidth: 360, marginBottom: 14 }} />

      <div className="table-wrap">
        {!loaded ? (
          <Loader label="Loading inventory…" />
        ) : drugs.length === 0 ? (
          <div className="empty">
            No drugs yet.
            {suppliers.length === 0 && ' Add a supplier first, then'}
            {mayEdit ? <> use <strong>Add drug</strong> to build your inventory.</> : ' ask the super admin to add them.'}
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
                {actions && <th></th>}
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
                    {actions && (
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {mayEdit && <button onClick={() => openEdit(d)} className="btn btn-ghost btn-sm">Edit</button>}
                          {mayDelete && (
                            <button onClick={() => { setConfirm(d); setError(''); }} className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--red)' }}>Delete</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!mayEdit && loaded && drugs.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 12, maxWidth: 640 }}>
          Your account can see the inventory but not change it. The super admin grants
          <strong> Add &amp; edit drugs</strong> under Users &amp; Access.
        </div>
      )}

      {show && (
        <div className="overlay">
          <div className="modal modal-md">
            <h2>{editing ? 'Edit drug' : 'Add drug'}</h2>
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
                <div>
                  <div className="field-label">Opening stock</div>
                  <input value={form.stock} onChange={set('stock')} placeholder="0" type="number" min="0" className="field" />
                </div>
                <div>
                  {/* Plenty of stock has no printed expiry, so this stays blank as
                      often as not — a drug without one never shows as expiring. */}
                  <div className="field-label">Expiry month — optional</div>
                  <input value={form.expiry} onChange={set('expiry')} type="month" className="field" />
                </div>
              </div>
              <div className="form-row">
                <input value={form.batch} onChange={set('batch')} placeholder="Batch number (optional)" className="field" />
                <input value={form.barcode} onChange={set('barcode')} placeholder="Barcode (optional)" className="field" />
              </div>
              {error && <div className="banner banner-error">{error}</div>}
            </div>
            <div className="modal-actions">
              <button onClick={() => { setShow(false); setEditing(null); setError(''); }} className="btn btn-cancel">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn btn-primary">
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Save drug'}
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
              It disappears from the counter and the drug list. Past invoices keep the name and
              the prices they were sold at.
              {confirm.stock > 0 && (
                <div className="banner banner-error" style={{ marginTop: 10 }}>
                  {confirm.stock} still in stock — sell or write it off before deleting.
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={() => setConfirm(null)} className="btn btn-cancel">Keep drug</button>
              <button onClick={remove} disabled={busy || confirm.stock > 0} className="btn btn-primary"
                style={{ background: 'var(--red)' }}>
                {busy ? 'Deleting…' : 'Delete drug'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
