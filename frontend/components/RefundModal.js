'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt } from '@/lib/format';

/**
 * Take drugs back off a sale. Quantities are capped at what is still returnable,
 * and the summary spells out where the money goes before anything is saved —
 * against the customer's قرض first, cash out of the till for the rest.
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
  const lines = useMemo(() => invoice.items.map((it) => ({
    ...it,
    left: it.qty - ((already || {})[it.name] || 0)
  })), [invoice.items, already]);

  const set = (name, value, left) => {
    const n = Math.max(0, Math.min(left, Math.floor(+value || 0)));
    setQty((q) => ({ ...q, [name]: n }));
  };

  const chosen = lines.filter((l) => (qty[l.name] || 0) > 0);
  const amount = chosen.reduce((t, l) => t + l.price * qty[l.name], 0);
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
          {invoice.customer}{invoice.phone ? ` · ${invoice.phone}` : ''}
        </div>

        {already === null ? (
          <div className="empty" style={{ padding: '24px 0' }}>Loading…</div>
        ) : nothingLeft ? (
          <div className="banner banner-error">Everything on this invoice has already been returned.</div>
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
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    Taken off the customer&apos;s قرض first; anything left over is paid out of the till.
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
