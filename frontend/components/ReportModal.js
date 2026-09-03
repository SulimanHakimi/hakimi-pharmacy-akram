'use client';

import { useApp } from '@/lib/store';
import { makeFmt } from '@/lib/format';

function Tile({ label, value, tone }) {
  const bg = tone === 'amber' ? 'var(--amber-soft)' : tone === 'red' ? 'var(--red-soft)' : 'var(--blue-soft)';
  const color = tone === 'amber' ? 'var(--amber)' : tone === 'red' ? 'var(--red)' : undefined;
  return (
    <div className="doc-tile" style={{ background: bg }}>
      <div className="k" style={{ color: color || 'var(--muted)' }}>{label}</div>
      <div className="v" style={{ color }}>{value}</div>
    </div>
  );
}

export default function ReportModal({ report, onClose }) {
  const { settings, user } = useApp();
  const fmt = makeFmt(settings.currency);
  if (!report) return null;

  const generated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    + ', ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const plRows = report.type === 'pl' ? [
    { label: 'Revenue', amt: fmt(report.revenue), fs: 13, w: 600, c: 'var(--text)' },
    { label: 'Cost of goods sold', amt: '−' + fmt(report.cogs), fs: 13, w: 400, c: 'var(--muted)' },
    // Already inside the line above — spelled out so a period with spoilage in it can
    // be explained, and left out entirely when there was none.
    ...(report.writtenOff > 0
      ? [{ label: 'of which stock written off', amt: fmt(report.writtenOff), fs: 12, w: 400, c: 'var(--faint)' }]
      : []),
    { label: 'Gross profit', amt: fmt(report.grossProfit), fs: 13, w: 600, c: 'var(--text)' },
    { label: 'Operating expenses', amt: '−' + fmt(report.opEx), fs: 13, w: 400, c: 'var(--muted)' },
    // Owner cash added in the period. Only shown when there is some, so an ordinary
    // trading period reads exactly as it did before.
    ...(report.capital > 0
      ? [{ label: 'Capital added', amt: '+' + fmt(report.capital), fs: 13, w: 400, c: 'var(--green)' }]
      : []),
    { label: 'Net profit', amt: (report.netProfit >= 0 ? '' : '−') + fmt(Math.abs(report.netProfit)), fs: 15, w: 700, c: report.netProfit >= 0 ? 'var(--green)' : 'var(--red)' }
  ] : [];

  return (
    <div className="overlay">
      <div className="doc-shell report">
        <div className="doc" style={{ padding: '30px 28px', maxHeight: '74vh' }}>
          <div style={{ paddingBottom: 14, borderBottom: '2px solid var(--primary)' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{settings.pharmacyName}</div>
            <div className="doc-meta">
              {[settings.pharmacyAddress, settings.pharmacyLicense && `License ${settings.pharmacyLicense}`]
                .filter(Boolean).join(' · ')}
            </div>
          </div>

          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{report.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {report.range} · Generated {generated} by {user?.name}
            </div>
          </div>

          {report.type === 'sales' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <Tile label="Revenue" value={fmt(report.rev)} />
                <Tile label="Profit" value={fmt(report.profit)} />
                <Tile label="Invoices" value={report.invs.toLocaleString('en-GB')} />
                <Tile label="Avg invoice" value={fmt(report.avg)} />
              </div>
              <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Top selling drugs</div>
                {report.top.length === 0 && <div style={{ fontSize: 12, color: 'var(--faint)' }}>No sales in this period.</div>}
                {report.top.map((t) => (
                  <div key={t.rank} className="doc-line">
                    <div>{t.rank}. {t.name} <span style={{ color: 'var(--faint)' }}>— {t.units.toLocaleString('en-GB')} units</span></div>
                    <div style={{ fontWeight: 600 }} className="tnum">{fmt(t.rev)}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Sales by category</div>
                {report.cats.length === 0 && <div style={{ fontSize: 12, color: 'var(--faint)' }}>No sales in this period.</div>}
                {report.cats.map((c) => (
                  <div key={c.name} className="doc-line">
                    <div>{c.name} <span style={{ color: 'var(--faint)' }}>— {c.pct}%</span></div>
                    <div style={{ fontWeight: 600 }} className="tnum">{fmt(c.amount)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {report.type === 'pl' && (
            <div style={{ padding: '14px 0' }}>
              {plRows.map((r) => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--hairline)', fontSize: r.fs, fontWeight: r.w, color: r.c }}>
                  <div>{r.label}</div><div className="tnum">{r.amt}</div>
                </div>
              ))}
            </div>
          )}

          {report.type === 'invt' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <Tile label="Drugs" value={report.items} />
                <Tile label="Units in stock" value={report.units.toLocaleString('en-GB')} />
                <Tile label="Stock value (buy)" value={fmt(report.buyValue)} />
                <Tile label="Value at sell price" value={fmt(report.sellValue)} />
                <Tile label="Low stock" value={report.lowCount} tone="amber" />
                <Tile label="Expiring soon" value={report.expCount} tone="red" />
              </div>
              <div style={{ padding: '14px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Highest-value stock</div>
                {report.rows.length === 0 && <div style={{ fontSize: 12, color: 'var(--faint)' }}>No drugs in inventory yet.</div>}
                {report.rows.map((r) => (
                  <div key={r.name} className="doc-line">
                    <div>{r.name} <span style={{ color: 'var(--faint)' }}>— {r.stock} units</span></div>
                    <div style={{ fontWeight: 600 }} className="tnum">{fmt(r.value)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--faint)', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            Generated by {settings.pharmacyName} Management System
          </div>
        </div>

        <div className="doc-actions">
          <button onClick={onClose} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.16)', color: '#FFFFFF' }}>Close</button>
          <button onClick={() => window.print()} className="btn btn-primary" style={{ flex: 2 }}>Print report</button>
        </div>
      </div>
    </div>
  );
}
