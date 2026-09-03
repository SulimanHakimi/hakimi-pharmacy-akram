'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt } from '@/lib/format';
import { avatar } from '@/lib/ui';
import Loader from '@/components/Loader';

const EMPTY = { name: '', person: '', phone: '', address: '' };

export default function SuppliersPage() {
  const { settings, L } = useApp();
  const fmt = makeFmt(settings.currency);
  const [suppliers, setSuppliers] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api('/suppliers').then(setSuppliers).catch(() => {}).finally(() => setLoaded(true));
    api('/drugs').then(setDrugs).catch(() => {});
    api('/suppliers/price-comparison').then(setComparison).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api('/suppliers', { method: 'POST', body: form });
      setShow(false);
      setForm(EMPTY);
      load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function pay(s) {
    try { await api(`/suppliers/${s._id}/pay`, { method: 'POST', body: { amount: s.balance } }); load(); }
    catch (e) { setError(e.message); }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const initialsOf = (name) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  return (
    <>
      <div className="page-head">
        <h1>{L.sup}</h1>
        <button onClick={() => { setForm(EMPTY); setError(''); setShow(true); }} className="btn btn-primary">+ Add supplier</button>
      </div>

      {error && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}

      {!loaded ? (
        <div className="card"><Loader label="Loading suppliers…" /></div>
      ) : suppliers.length === 0 ? (
        <div className="card empty">No suppliers yet. Add one to start recording purchases.</div>
      ) : (
        <div className="grid-2">
          {suppliers.map((s) => {
            const supplied = drugs.filter((d) => d.supplier === s.name);
            const stockValue = supplied.reduce((sum, d) => sum + (d.buy || 0) * (d.stock || 0), 0);
            return (
            <div key={s._id} className="card" style={{ borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div className="avatar" style={avatar(40)}>{initialsOf(s.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {[s.person, s.phone].filter(Boolean).join(' · ') || 'No contact recorded'}
                  </div>
                </div>
              </div>
              {s.address && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>{s.address}</div>}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Drugs supplied</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }} className="tnum">{supplied.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Stock value</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }} className="tnum">{stockValue ? fmt(stockValue) : '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--faint)' }}>at buy price</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total purchased</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }} className="tnum">{s.purchased ? fmt(s.purchased) : '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--faint)' }}>{s.orders ? `${s.orders} order${s.orders > 1 ? 's' : ''}` : 'No orders'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Outstanding balance</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }} className="tnum">{s.balance ? fmt(s.balance) : 'Settled'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Last order</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{s.lastOrder || '—'}</div>
                </div>
                {s.balance > 0 && (
                  <button onClick={() => pay(s)} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                    Pay {fmt(s.balance)}
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {comparison.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Buy price comparison</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', margin: '2px 0 12px' }}>
            Drugs you stock from more than one supplier — cheapest highlighted.
          </div>
          {comparison.map((r) => {
            const min = r.prices[0].buy;
            return (
              <div key={r.drug} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--hairline)', flexWrap: 'wrap' }}>
                <div style={{ width: 210, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{r.drug}</div>
                <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                  {r.prices.map((p) => (
                    <div key={p.supplier} style={{ flex: '1 1 140px', borderRadius: 10, padding: '8px 12px', background: p.buy === min ? 'var(--green-soft)' : 'var(--bg)' }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{p.supplier}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: p.buy === min ? 'var(--green)' : 'var(--muted)' }} className="tnum">
                        {fmt(p.buy)} {p.buy === min && <span style={{ fontSize: 10 }}>Best price</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {show && (
        <div className="overlay">
          <div className="modal modal-sm">
            <h2>Add supplier</h2>
            <div className="form-grid">
              <input value={form.name} onChange={set('name')} placeholder="Company name" className="field" />
              <input value={form.person} onChange={set('person')} placeholder="Contact person" className="field" />
              <input value={form.phone} onChange={set('phone')} placeholder="Phone number" className="field" />
              <input value={form.address} onChange={set('address')} placeholder="Address" className="field" />
              {error && <div className="banner banner-error">{error}</div>}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShow(false)} className="btn btn-cancel">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save supplier'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
