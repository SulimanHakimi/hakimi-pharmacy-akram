'use client';

import { useApp } from '@/lib/store';
import { makeFmt, dateStr } from '@/lib/format';

const ROW = { display: 'grid', gridTemplateColumns: '2.2fr 0.5fr 0.9fr 1fr', gap: '4px 8px' };
const META = { color: 'var(--muted)' };
const RIGHT = { textAlign: 'right' };

export default function InvoiceModal({ invoice, onClose }) {
  const { settings, user } = useApp();
  const fmt = makeFmt(settings.currency);
  if (!invoice) return null;

  return (
    <div className="overlay">
      <div className="doc-shell">
        <div className="doc">
          <div className="doc-head">
            <div className="doc-name">{settings.pharmacyName}</div>
            {/* Only print the details that have actually been filled in. */}
            <div className="doc-meta" style={{ marginTop: 2 }}>
              {[settings.pharmacyAddress, settings.pharmacyPhone].filter(Boolean).join(' · ')}
            </div>
            {settings.pharmacyLicense && (
              <div className="doc-meta">License no. {settings.pharmacyLicense}</div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', padding: '12px 0', fontSize: 12, borderBottom: '1px dashed #C6D0D8' }}>
            <div style={META}>Invoice</div><div style={{ ...RIGHT, fontWeight: 600 }}>{invoice.no}</div>
            <div style={META}>Date</div><div style={RIGHT}>{dateStr(invoice.date)}</div>
            <div style={META}>Customer</div><div style={RIGHT}>{invoice.customer}</div>
            <div style={META}>Phone</div><div style={RIGHT} className="tnum">{invoice.phone || '—'}</div>
            <div style={META}>Prescribed by</div><div style={RIGHT}>{invoice.doctor || 'No prescription'}</div>
            <div style={META}>Served by</div><div style={RIGHT}>{invoice.servedBy || user?.name}</div>
            <div style={META}>Payment</div><div style={{ ...RIGHT, fontWeight: 600 }}>{invoice.payment || 'Cash'}</div>
          </div>

          <div style={{ ...ROW, padding: '10px 0 6px', fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            <div>Item</div><div style={{ textAlign: 'center' }}>Qty</div><div style={RIGHT}>Price</div><div style={RIGHT}>Amount</div>
          </div>
          {invoice.items.map((r, i) => (
            <div key={i} style={{ ...ROW, padding: '5px 0', fontSize: 12 }}>
              <div>{r.name}</div>
              <div style={{ textAlign: 'center' }} className="tnum">{r.qty}</div>
              <div style={RIGHT} className="tnum">{fmt(r.price)}</div>
              <div style={{ ...RIGHT, fontWeight: 600 }} className="tnum">{fmt(r.price * r.qty)}</div>
            </div>
          ))}

          <div style={{ borderTop: '1px dashed #C6D0D8', marginTop: 10, paddingTop: 10 }}>
            <div className="doc-line" style={{ color: 'var(--muted)' }}>
              <div>Subtotal</div><div className="tnum">{fmt(invoice.sub)}</div>
            </div>
            {invoice.disc > 0 && (
              <div className="doc-line" style={{ color: 'var(--muted)' }}>
                <div>Discount</div><div className="tnum">−{fmt(invoice.disc)}</div>
              </div>
            )}
            {invoice.vat > 0 && (
              <div className="doc-line" style={{ color: 'var(--muted)' }}>
                <div>VAT</div><div className="tnum">{fmt(invoice.vat)}</div>
              </div>
            )}
            <div className="doc-total">
              <div>Total</div><div className="tnum">{fmt(invoice.total)}</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 16, paddingTop: 12, borderTop: '1px dashed #C6D0D8' }}>
            Thank you — get well soon.<br />Medicines are not returnable once sold.
          </div>
        </div>

        <div className="doc-actions">
          <button onClick={onClose} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.16)', color: '#FFFFFF' }}>Close</button>
          <button onClick={() => window.print()} className="btn btn-primary" style={{ flex: 2 }}>Print invoice</button>
        </div>
      </div>
    </div>
  );
}
