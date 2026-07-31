'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, fmtK, dm } from '@/lib/format';
import ReportModal from '@/components/ReportModal';

const PERIODS = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']];
const REPORTS = [
  ['Daily sales', 'sales', 'daily'],
  ['Weekly sales', 'sales', 'weekly'],
  ['Monthly sales', 'sales', 'monthly'],
  ['Yearly sales', 'sales', 'yearly'],
  ['Profit & loss', 'pl', 'monthly'],
  ['Inventory report', 'invt', 'daily']
];

export default function AnalyticsPage() {
  const { settings, L } = useApp();
  const fmt = makeFmt(settings.currency);
  const [period, setPeriod] = useState('daily');
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/analytics/period/${period}`).then(setData).catch((e) => setError(e.message));
  }, [period]);

  async function openReport(type, p) {
    setError('');
    try { setReport(await api(`/analytics/report?type=${type}&period=${p}`)); }
    catch (e) { setError(e.message); }
  }

  const delta = (a, b) => {
    if (!b) return { s: a > 0 ? 'New' : 'No change', c: 'var(--muted)' };
    const p = Math.round((a - b) / b * 100);
    return { s: (p >= 0 ? '+' : '') + p + '%', c: p >= 0 ? 'var(--green)' : 'var(--red)' };
  };
  const revD = data ? delta(data.cur.rev, data.prev.rev) : { s: '', c: 'var(--muted)' };
  const invD = data ? delta(data.cur.invs, data.prev.invs) : { s: '', c: 'var(--muted)' };
  const maxBar = data?.bars?.length ? Math.max(...data.bars.map((b) => b.v), 1) : 1;
  const margin = data && data.cur.rev > 0 ? Math.round(data.cur.profit / data.cur.rev * 100) : 0;
  const avg = data && data.cur.invs > 0 ? data.cur.rev / data.cur.invs : 0;

  return (
    <>
      <div className="page-head">
        <h1>{L.ana}</h1>
        <div className="segment">
          {PERIODS.map(([k, label]) => (
            <button key={k} onClick={() => setPeriod(k)} className={period === k ? 'on' : ''}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{data?.range}</div>

      {error && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="label">Revenue</div>
          <div className="stat-value">{fmt(data?.cur.rev || 0)}</div>
          <div className="stat-sub" style={{ fontWeight: 600, color: revD.c }}>{revD.s} vs previous</div>
        </div>
        <div className="card">
          <div className="label">Profit</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{fmt(data?.cur.profit || 0)}</div>
          <div className="stat-sub">{margin}% average margin</div>
        </div>
        <div className="card">
          <div className="label">Invoices</div>
          <div className="stat-value">{(data?.cur.invs || 0).toLocaleString('en-GB')}</div>
          <div className="stat-sub" style={{ fontWeight: 600, color: invD.c }}>{invD.s} vs previous</div>
        </div>
        <div className="card">
          <div className="label">Avg invoice</div>
          <div className="stat-value">{fmt(avg)}</div>
          <div className="stat-sub">Per customer visit</div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{data?.title}</div>
        <div className="bar-chart">
          {(data?.bars || []).map((b, i) => (
            <div key={b.t} className="bar-col" title={`${dm(b.t)} — ${fmt(b.v)}`}>
              <div className="bar-value">{b.v > 0 ? fmtK(b.v) : ''}</div>
              <div className={`bar${i === data.bars.length - 1 ? ' latest' : ''}`}
                style={{ height: `${Math.max(2, Math.round(b.v / maxBar * 100))}%` }}></div>
              <div className="bar-label">{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Top selling drugs</div>
          {!data?.top?.length && <div style={{ fontSize: 13, color: 'var(--faint)', padding: '8px 0' }}>No sales in this period.</div>}
          {(data?.top || []).map((t) => (
            <div key={t.name} className="list-row" style={{ gap: 12 }}>
              <div className="avatar" style={{ width: 26, height: 26, fontSize: 12 }}>{t.rank}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }} className="tnum">{t.units.toLocaleString('en-GB')} units sold</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }} className="tnum">{fmt(t.rev)}</div>
            </div>
          ))}

          {data?.slow?.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', margin: '14px 0 2px' }}>Slow moving</div>
              {data.slow.map((t) => (
                <div key={t.name} className="row-between" style={{ fontSize: 12, padding: '4px 0' }}>
                  <div>{t.name} <span style={{ color: 'var(--faint)' }}>— {t.units.toLocaleString('en-GB')} units</span></div>
                  <div style={{ color: 'var(--muted)' }} className="tnum">{fmt(t.rev)}</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Sales by category</div>
          {!data?.cats?.length && <div style={{ fontSize: 13, color: 'var(--faint)' }}>No sales in this period.</div>}
          {(data?.cats || []).map((c) => (
            <div key={c.name} style={{ marginBottom: 12 }}>
              <div className="row-between" style={{ fontSize: 13, marginBottom: 5 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ color: 'var(--muted)' }} className="tnum">{fmt(c.amount)} · {c.pct}%</div>
              </div>
              <div className="meter"><div style={{ width: `${c.pct}%` }}></div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Sales reports</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Generate a printable report for any period.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          {REPORTS.map(([label, type, p]) => (
            <button key={label} onClick={() => openReport(type, p)} className="btn btn-ghost" style={{ height: 44 }}>{label}</button>
          ))}
        </div>
      </div>

      {report && <ReportModal report={report} onClose={() => setReport(null)} />}
    </>
  );
}
