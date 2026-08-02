'use client';

import { useApp } from '@/lib/store';
import { makeFmt, dariDate } from '@/lib/format';
import { invoiceSplit } from '@/lib/ui';
import { INVOICE_DARI as D, PAYMENT_DARI } from '@/lib/labels';

const ROW = { display: 'grid', gridTemplateColumns: '2.2fr 0.5fr 0.9fr 1fr', gap: '4px 8px' };
const META = { color: 'var(--muted)' };
// Reads right-to-left, so the "right" column of an English invoice is the left one.
const VALUE = { textAlign: 'left' };

/**
 * The printed sale. Everything a customer sees here is in Dari — the buttons under
 * it are not printed and stay in English with the rest of the app.
 */
export default function InvoiceModal({ invoice, onClose }) {
  const { settings, user } = useApp();
  const fmt = makeFmt(settings.currency);
  if (!invoice) return null;
  const { paid, due } = invoiceSplit(invoice);
  const payment = PAYMENT_DARI[invoice.payment] || PAYMENT_DARI.Cash;

  return (
    <div className="overlay">
      <div className="doc-shell">
        <div className="doc doc-rtl" lang="fa-AF" dir="rtl">
          <div className="doc-head">
            <div className="doc-name">{settings.pharmacyName}</div>
            {/* Only print the details that have actually been filled in. */}
            <div className="doc-meta" style={{ marginTop: 2 }}>
              {[settings.pharmacyAddress, settings.pharmacyPhone].filter(Boolean).join(' · ')}
            </div>
            {settings.pharmacyLicense && (
              <div className="doc-meta">{D.license} {settings.pharmacyLicense}</div>
            )}
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{D.title}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', padding: '12px 0', fontSize: 12, borderBottom: '1px dashed #C6D0D8' }}>
            <div style={META}>{D.no}</div><div style={{ ...VALUE, fontWeight: 600 }} className="tnum">{invoice.no}</div>
            <div style={META}>{D.date}</div><div style={VALUE}>{dariDate(invoice.date)}</div>
            <div style={META}>{D.customer}</div><div style={VALUE}>{invoice.customer || D.walkIn}</div>
            <div style={META}>{D.doctor}</div><div style={VALUE}>{invoice.doctor || D.noDoctor}</div>
            <div style={META}>{D.servedBy}</div><div style={VALUE}>{invoice.servedBy || user?.name}</div>
            <div style={META}>{D.payment}</div><div style={{ ...VALUE, fontWeight: 600 }}>{payment}</div>
          </div>

          <div style={{ ...ROW, padding: '10px 0 6px', fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>
            <div>{D.item}</div><div style={{ textAlign: 'center' }}>{D.qty}</div>
            <div style={VALUE}>{D.price}</div><div style={VALUE}>{D.amount}</div>
          </div>
          {invoice.items.map((r, i) => (
            <div key={i} style={{ ...ROW, padding: '5px 0', fontSize: 12 }}>
              <div>{r.name}</div>
              <div style={{ textAlign: 'center' }} className="tnum">{r.qty}</div>
              <div style={VALUE} className="tnum">{fmt(r.price)}</div>
              <div style={{ ...VALUE, fontWeight: 600 }} className="tnum">{fmt(r.price * r.qty)}</div>
            </div>
          ))}

          <div style={{ borderTop: '1px dashed #C6D0D8', marginTop: 10, paddingTop: 10 }}>
            <div className="doc-line" style={{ color: 'var(--muted)' }}>
              <div>{D.sub}</div><div className="tnum">{fmt(invoice.sub)}</div>
            </div>
            {invoice.disc > 0 && (
              <div className="doc-line" style={{ color: 'var(--muted)' }}>
                <div>{D.disc}</div><div className="tnum">−{fmt(invoice.disc)}</div>
              </div>
            )}
            {invoice.vat > 0 && (
              <div className="doc-line" style={{ color: 'var(--muted)' }}>
                <div>{D.vat}</div><div className="tnum">{fmt(invoice.vat)}</div>
              </div>
            )}
            <div className="doc-total">
              <div>{D.total}</div><div className="tnum">{fmt(invoice.total)}</div>
            </div>
            {/* Only worth printing when the customer did not settle the bill outright. */}
            {due > 0 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #C6D0D8' }}>
                <div className="doc-line"><div>{D.paidNow}</div><div className="tnum">{fmt(paid)}</div></div>
                <div className="doc-line" style={{ fontWeight: 700 }}>
                  <div>{D.remaining}</div><div className="tnum">{fmt(due)}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 16, paddingTop: 12, borderTop: '1px dashed #C6D0D8' }}>
            {D.thanks}<br />{D.noReturn}
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
