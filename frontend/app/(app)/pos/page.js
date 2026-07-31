'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, todayStr, monthsTo } from '@/lib/format';
import { warningsFor } from '@/lib/interactions';
import { C } from '@/lib/ui';
import InvoiceModal from '@/components/InvoiceModal';

export default function PosPage() {
  const { settings, L } = useApp();
  const fmt = makeFmt(settings.currency);
  const [drugs, setDrugs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [bcode, setBcode] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [doctor, setDoctor] = useState('');
  const [discount, setDiscount] = useState('');
  const [discMode, setDiscMode] = useState('pct');
  const [payMode, setPayMode] = useState('cash');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadDrugs = () => api('/drugs').then(setDrugs).catch(() => {}).finally(() => setLoaded(true));
  useEffect(() => { loadDrugs(); }, []);

  // A prescription dispensed on the Prescriptions page hands the sale over here.
  useEffect(() => {
    const raw = sessionStorage.getItem('hp_pos_prefill');
    if (!raw) return;
    sessionStorage.removeItem('hp_pos_prefill');
    try {
      const p = JSON.parse(raw);
      setCustomer(p.customer || '');
      setPhone(p.phone || '');
      setDoctor(p.doctor || '');
      setCart((p.items || []).map((i) => ({ id: i.drugId, qty: i.qty })));
    } catch {}
  }, []);

  const byId = useMemo(() => Object.fromEntries(drugs.map((d) => [d._id, d])), [drugs]);
  const q = search.trim().toLowerCase();
  const visible = q
    ? drugs.filter((d) => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q))
    : drugs;

  function addToCart(id) {
    const d = byId[id];
    if (!d || d.stock <= 0) return;
    setCart((c) => {
      const line = c.find((x) => x.id === id);
      if (line) return line.qty >= d.stock ? c : c.map((x) => x.id === id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { id, qty: 1 }];
    });
  }

  function chgQty(id, delta) {
    const d = byId[id];
    setCart((c) => c.map((x) => x.id === id ? { ...x, qty: Math.max(1, Math.min(d.stock, x.qty + delta)) } : x));
  }

  function onBarcode(e) {
    const v = e.target.value.trim();
    const d = drugs.find((x) => x.barcode && x.barcode === v);
    if (d) { addToCart(d._id); setBcode(''); } else setBcode(v);
  }

  const sub = cart.reduce((t, c) => t + (byId[c.id]?.sell || 0) * c.qty, 0);
  const dv = +discount || 0;
  const disc = dv <= 0 ? 0 : Math.min(discMode === 'amt' ? dv : sub * Math.min(dv, 100) / 100, sub);
  const vat = (sub - disc) * (settings.vatRate || 0) / 100;
  const total = sub - disc + vat;
  const warnings = warningsFor(cart.map((c) => byId[c.id]?.name).filter(Boolean));

  async function checkout() {
    if (!cart.length || busy) return;
    setTouched(true);
    if (!customer.trim() || !phone.trim()) {
      setError('Customer name and phone number are required to complete the sale.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const inv = await api('/invoices', {
        method: 'POST',
        body: { items: cart.map((c) => ({ drugId: c.id, qty: c.qty })), customer, phone, doctor, discount: dv, discMode, payMode }
      });
      setInvoice(inv);
      setCart([]); setCustomer(''); setPhone(''); setDoctor('');
      setDiscount(''); setPayMode('cash'); setTouched(false);
      loadDrugs();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  const payBtn = (active) => ({
    flex: 1, height: 38, borderRadius: 999,
    border: `1.5px solid ${active ? C.primary : C.border}`,
    background: active ? C.blueSoft : '#FFFFFF',
    color: active ? C.primary : C.muted,
    fontSize: 13, fontWeight: 600, cursor: 'pointer'
  });

  return (
    <>
      <div className="page-head">
        <h1>{L.pos}</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{todayStr()}</div>
      </div>

      <div className="pos-layout">
        <div className="pos-products">
          <div className="pos-search">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drugs by name or category…" className="field"
              style={{ flex: '2 1 220px', padding: '12px 16px' }} />
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="1.8"
                style={{ position: 'absolute', left: 13, top: 14 }}>
                <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3"></path><path d="M8 8v8M12 8v8M16 8v8"></path>
              </svg>
              <input value={bcode} onChange={onBarcode} placeholder="Scan barcode…" className="field"
                style={{ padding: '12px 14px 12px 36px' }} />
            </div>
          </div>

          {loaded && drugs.length === 0 && (
            <div className="card empty">
              No drugs in inventory yet. Add them from the Inventory page before selling.
            </div>
          )}
          {loaded && drugs.length > 0 && visible.length === 0 && (
            <div className="card empty">No drug matches &ldquo;{search}&rdquo;.</div>
          )}

          <div className="pos-grid">
            {visible.map((d) => {
              const out = d.stock <= 0;
              const color = out ? C.red : d.stock < settings.lowStockThreshold ? C.amber : C.muted;
              return (
                <button key={d._id} onClick={() => addToCart(d._id)} disabled={out}
                  className={`drug-card${out ? ' out' : ''}`}>
                  <div className="pill pill-blue" style={{ marginBottom: 8 }}>{d.category}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{d.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, gap: 6 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }} className="tnum">{fmt(d.sell)}</div>
                    <div style={{ fontSize: 11, color }} className="tnum">
                      {out ? 'Out of stock' : `${d.stock} in stock`}
                    </div>
                  </div>
                  {!out && monthsTo(d.expiry) <= 3 && (
                    <div style={{ fontSize: 10, color: C.red, marginTop: 6, fontWeight: 600 }}>Expires soon</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pos-cart">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Current sale</div>

          <div className="form-grid" style={{ marginBottom: 12 }}>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name (required)"
              className={`field${touched && !customer.trim() ? ' invalid' : ''}`} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number (required)"
              className={`field${touched && !phone.trim() ? ' invalid' : ''}`} />
            <input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="Prescribing doctor (optional)" className="field" />
            {error && <div className="banner banner-error">{error}</div>}
          </div>

          {!cart.length && <div className="empty" style={{ padding: '28px 0' }}>Tap a drug to add it to the sale</div>}

          {cart.map((c) => {
            const d = byId[c.id];
            if (!d) return null;
            return (
              <div key={c.id} className="list-row" style={{ gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }} className="tnum">{fmt(d.sell)} each</div>
                </div>
                <button onClick={() => chgQty(c.id, -1)} className="qty-btn" aria-label="Decrease">−</button>
                <div style={{ fontSize: 13, fontWeight: 600, width: 20, textAlign: 'center' }} className="tnum">{c.qty}</div>
                <button onClick={() => chgQty(c.id, 1)} className="qty-btn" aria-label="Increase">+</button>
                <div style={{ fontSize: 13, fontWeight: 600, width: 78, textAlign: 'right' }} className="tnum">{fmt(d.sell * c.qty)}</div>
                <button onClick={() => setCart((x) => x.filter((y) => y.id !== c.id))} aria-label="Remove"
                  style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: 2 }}>×</button>
              </div>
            );
          })}

          {warnings.length > 0 && (
            <div style={{ background: 'var(--amber-soft)', borderRadius: 12, padding: '10px 12px', marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', marginBottom: 4 }}>⚠ Drug interaction warning</div>
              {warnings.map((w) => <div key={w} style={{ fontSize: 11, color: '#7A5200', padding: '2px 0' }}>{w}</div>)}
            </div>
          )}

          <div className="row-between" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 14 }}>
            <div>Subtotal</div><div className="tnum">{fmt(sub)}</div>
          </div>

          <div className="row-between" style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Discount</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" min="0" placeholder="0"
                className="field" style={{ width: 74, padding: '6px 10px', borderRadius: 10, textAlign: 'right' }} />
              <div style={{ display: 'flex', background: 'var(--blue-soft)', borderRadius: 999, padding: 2 }}>
                {[['pct', '%'], ['amt', settings.currency]].map(([m, label]) => (
                  <button key={m} onClick={() => setDiscMode(m)}
                    style={{ height: 24, padding: '0 10px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: discMode === m ? C.primary : 'transparent', color: discMode === m ? '#FFFFFF' : C.muted }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {disc > 0 && (
            <div className="row-between" style={{ fontSize: 13, color: 'var(--red)', marginTop: 6 }}>
              <div>Discount applied</div><div className="tnum">−{fmt(disc)}</div>
            </div>
          )}
          {settings.vatRate > 0 && (
            <div className="row-between" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
              <div>VAT ({settings.vatRate}%)</div><div className="tnum">{fmt(vat)}</div>
            </div>
          )}

          <div className="row-between" style={{ fontSize: 20, fontWeight: 600, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div>Total</div><div className="tnum">{fmt(total)}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setPayMode('cash')} style={payBtn(payMode === 'cash')}>Cash</button>
            <button onClick={() => setPayMode('credit')} style={payBtn(payMode === 'credit')}>Credit (نسیه)</button>
          </div>
          {payMode === 'credit' && (
            <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 8 }}>
              The total is added to the customer&apos;s credit account — collect it later from Customers.
            </div>
          )}

          <button onClick={checkout} disabled={busy || !cart.length}
            className="btn btn-primary btn-block" style={{ height: 48, marginTop: 14, fontSize: 15 }}>
            {busy ? 'Saving…' : 'Complete sale & print invoice'}
          </button>
        </div>
      </div>

      {invoice && <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />}
    </>
  );
}
