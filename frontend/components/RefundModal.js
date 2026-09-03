'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt } from '@/lib/format';
import { invoiceOwed } from '@/lib/ui';
import Loader from '@/components/Loader';

/**
 * Take drugs back off a sale. Quantities are capped at what is still returnable,
 * and the summary spells out where the money goes before anything is saved —
 * against whatever this bill still owes first, cash out of the till for the rest.
 */
export default function RefundModal({ invoice, onClose, onDone }) {
  const { settings } = useApp();
  const fmt = makeFmt(settings.currency);
  const [already, setAlready] = useState(null);      // null = still loading
  const [qty, setQty] = useState({});
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/returns?invoice=${invoice._id}`)
      .then((d) => setAlready(d.returned || {}))
      .catch((e) => { setError(e.message); setAlready({}); });
  }, [invoice._id]);

  // What is left on each line after everything already taken back.
  // Procedure fees are on the invoice too, and there is nothing to take back on
  // one — the work was done. Only goods can come off a bill here.
  const lines = useMemo(() => invoice.items.filter((it) => !it.service).map((it) => ({
    ...it,
    left: it.qty - ((already || {})[it.name] || 0)
  })), [invoice.items, already]);

  const set = (name, value, left) => {
    const n = Math.max(0, Math.min(left, Math.floor(+value || 0)));
    setQty((q) => ({ ...q, [name]: n }));
  };

  const chosen = lines.filter((l) => (qty[l.name] || 0) > 0);

  // Worked out exactly the way the server does it, so what the counter reads out to
  // the customer is what actually happens. Line prices are pre-discount and
  // pre-VAT while the customer paid the total, so the value is scaled by the same
  // ratio; then this bill's own قرض is cancelled before any cash is handed over.
  const gross = chosen.reduce((t, l) => t + l.price * qty[l.name], 0);
  const amount = invoice.sub > 0 ? gross * (invoice.total / invoice.sub) : gross;
  const offCredit = Math.min(amount, invoiceOwed(invoice));
  const cashBack = amount - offCredit;
  const noGoods = already !== null && lines.length === 0;
  const nothingLeft = already !== null && lines.every((l) => l.left <= 0);

  async function submit() {
    if (busy || !chosen.length) return;
    setBusy(true);
    setError('');
    try {
      await api('/returns', {
        method: 'POST',
        body: {
          invoiceId: invoice._id,
          items: chosen.map((l) => ({ name: l.name, qty: qty[l.name] })),
          reason, restock
        }
      });
      onDone();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <div className="overlay">
      <div className="modal modal-md">
        <h2>Return against {invoice.no}</h2>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: -10, marginBottom: 14 }}>
          {invoice.customer}
        </div>

        {already === null ? (
          <Loader label="Checking what is still returnable…" pad={24} />
        ) : nothingLeft ? (
          <div className="banner banner-error">
            {noGoods
              ? 'There is nothing to take back on this bill — it is a service fee, not goods.'
              : 'Everything on this invoice has already been returned.'}
          </div>
        ) : (
          <>
            <div style={{ maxHeight: '38vh', overflowY: 'auto' }}>
              {lines.map((l) => (
                <div key={l.name} className="list-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {fmt(l.price)} each · sold {l.qty}
                      {l.left < l.qty && ` · ${l.qty - l.left} already back`}
                    </div>
                  </div>
                  {l.left <= 0 ? (
                    <span className="pill pill-red">All returned</span>
                  ) : (
                    <>
                      <input value={qty[l.name] ?? ''} onChange={(e) => set(l.name, e.target.value, l.left)}
                        type="number" min="0" max={l.left} placeholder="0" className="field"
                        style={{ width: 72, padding: '6px 10px', borderRadius: 10, textAlign: 'right' }} />
                      <button onClick={() => set(l.name, l.left, l.left)} className="btn btn-ghost btn-sm">
                        All {l.left}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="form-grid" style={{ marginTop: 14 }}>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="field"
                placeholder="Reason, e.g. wrong strength (optional)" />

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)}
                  style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }} />
                <span>
                  Put the drugs back on the shelf
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Untick only for expired, opened or damaged medicine — the customer is still
                    paid back, but the stock is written off instead of resold.
                  </div>
                </span>
              </label>

              {amount > 0 && (
                <div style={{ background: 'var(--blue-soft)', borderRadius: 12, padding: '10px 12px' }}>
                  <div className="row-between" style={{ fontSize: 13, fontWeight: 600 }}>
                    <div>Value coming back</div><div className="tnum">{fmt(amount)}</div>
                  </div>
                  {offCredit > 0 && (
                    <div className="row-between" style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>
                      <div>Taken off the قرض on {invoice.no}</div><div className="tnum">{fmt(offCredit)}</div>
                    </div>
                  )}
                  <div className="row-between" style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                    <div>Cash out of the till</div><div className="tnum">{fmt(cashBack)}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {offCredit > 0
                      ? 'What this bill still owes is cancelled first; the rest is handed back over the counter.'
                      : 'This bill is paid up, so the whole value is handed back over the counter.'}
                  </div>
                </div>
              )}

              {error && <div className="banner banner-error">{error}</div>}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-cancel">Cancel</button>
          <button onClick={submit} disabled={busy || !chosen.length} className="btn btn-primary">
            {busy ? 'Saving…' : amount > 0 ? `Return ${fmt(amount)}` : 'Return'}
          </button>
        </div>
      </div>
    </div>
  );
}
