'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, dateStr } from '@/lib/format';

export default function PurchasesPage() {
  const { settings, L } = useApp();
  const fmt = makeFmt(settings.currency);
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ supplier: '', drugId: '', qty: '', cost: '', paid: false });

  const load = () => api('/purchases').then(setRows).catch(() => {}).finally(() => setLoaded(true));
  useEffect(() => {
    load();
    api('/suppliers').then(setSuppliers).catch(() => {});
    api('/drugs').then(setDrugs).catch(() => {});
  }, []);

  function openForm() {
    setForm({ supplier: suppliers[0]?.name || '', drugId: drugs[0]?._id || '', qty: '', cost: '', paid: false });
    setError('');
    setShow(true);
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api('/purchases', { method: 'POST', body: form });
      setShow(false);
      load();
      api('/drugs').then(setDrugs).catch(() => {});
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const total = (+form.qty || 0) * (+form.cost || 0);
  const canOrder = suppliers.length > 0 && drugs.length > 0;

  return (
    <>
      <div className="page-head">
        <h1>{L.pur}</h1>
        <button onClick={openForm} className="btn btn-primary" disabled={!canOrder}>+ New purchase order</button>
      </div>

      {!canOrder && loaded && (
        <div className="banner banner-error" style={{ marginBottom: 14 }}>
          Add at least one supplier and one drug before recording a purchase order.
        </div>
      )}

      <div className="table-wrap">
        {loaded && rows.length === 0 ? (
          <div className="empty">No purchase orders recorded yet.</div>
        ) : (
          <table className="data narrow">
            <thead>
              <tr>
                <th>PO #</th><th>Supplier</th><th>Date</th>
                <th className="num">Items</th><th className="num">Total</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p._id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.po}</td>
                  <td>{p.supplier}</td>
                  <td style={{ color: 'var(--muted)' }}>{dateStr(p.date)}</td>
                  <td className="num">{p.items}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmt(p.total)}</td>
                  <td><span className={`pill ${p.status === 'Received' ? 'pill-green' : 'pill-amber'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {show && (
        <div className="overlay">
          <div className="modal modal-md">
            <h2>New purchase order</h2>
            <div style={{ fontSize: 13, color: 'var(--muted)', margin: '-10px 0 16px' }}>
              Received stock is added to inventory immediately and the drug&apos;s buy price is updated.
            </div>
            <div className="form-grid">
              <select value={form.supplier} onChange={set('supplier')} className="field">
                {suppliers.map((s) => <option key={s._id}>{s.name}</option>)}
              </select>
              <select value={form.drugId} onChange={set('drugId')} className="field">
                {drugs.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
              <div className="form-row">
                <input value={form.qty} onChange={set('qty')} placeholder="Quantity" type="number" min="1" className="field" />
                <input value={form.cost} onChange={set('cost')} placeholder="Unit buy price" type="number" min="0" className="field" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.paid} onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))} />
                Paid now in cash — otherwise it is added to what you owe this supplier
              </label>
              <div className="row-between" style={{ fontSize: 13, padding: '10px 14px', background: 'var(--blue-soft)', borderRadius: 12 }}>
                <div style={{ color: 'var(--muted)' }}>Order total</div>
                <div style={{ fontWeight: 600 }} className="tnum">{fmt(total)}</div>
              </div>
              {error && <div className="banner banner-error">{error}</div>}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShow(false)} className="btn btn-cancel">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Receive order'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
