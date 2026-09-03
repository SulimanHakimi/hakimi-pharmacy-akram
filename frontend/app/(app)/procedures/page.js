'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { makeFmt, dateStr } from '@/lib/format';
import { PROCEDURE_TYPES, PROCEDURE_LABELS } from '@/lib/labels';
import InvoiceModal from '@/components/InvoiceModal';
import Loader from '@/components/Loader';

const [KHATNA, TATBIQ] = PROCEDURE_TYPES;
const TABS = [['all', 'All'], ...PROCEDURE_TYPES.map((t) => [t, t])];

const blank = () => ({
  type: KHATNA, patient: '', phone: '', fee: '', notes: '',
  drugId: '', drugQty: '1', items: [], payMode: 'cash', paidNow: ''
});

export default function ProceduresPage() {
  const { L, settings } = useApp();
  const fmt = makeFmt(settings.currency);
  const [data, setData] = useState(null);
  const [drugs, setDrugs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);            // null = modal closed
  const [bill, setBill] = useState(null);            // invoice being printed
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/procedures').then(setData).catch((e) => setError(e.message)).finally(() => setLoaded(true));
  useEffect(() => {
    load();
    api('/drugs').then(setDrugs).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function openForm() {
    setForm({ ...blank(), drugId: drugs[0]?._id || '' });
    setError('');
    setNotice('');
  }

  // Stock left after everything already in the basket, so the same box cannot be
  // added twice over what is on the shelf.
  const stockLeft = (drug) => {
    const taken = (form?.items || []).filter((i) => i.drugId === drug._id).reduce((t, i) => t + i.qty, 0);
    return drug.stock - taken;
  };

  function addDrug() {
    const d = drugs.find((x) => x._id === form.drugId);
    const qty = Math.floor(+form.drugQty);
    if (!d) return;
    if (!qty || qty < 1) { setError('Enter how many units were used'); return; }
    if (qty > stockLeft(d)) { setError(`Only ${stockLeft(d)} of ${d.name} left on the shelf`); return; }
    setError('');
    setForm((f) => {
      const found = f.items.find((i) => i.drugId === d._id);
      const items = found
        ? f.items.map((i) => (i.drugId === d._id ? { ...i, qty: i.qty + qty } : i))
        : [...f.items, { drugId: d._id, name: d.name, qty, price: d.sell }];
      return { ...f, items, drugQty: '1' };
    });
  }

  const removeDrug = (id) => setForm((f) => ({ ...f, items: f.items.filter((i) => i.drugId !== id) }));

  // The bill as the patient will see it, worked out the same way the server does.
  const quote = useMemo(() => {
    const fee = Math.max(0, +form?.fee || 0);
    const drugTotal = (form?.items || []).reduce((t, i) => t + i.price * i.qty, 0);
    const sub = fee + drugTotal;
    const vat = sub * (settings.vatRate || 0) / 100;
    const total = sub + vat;
    const now = form?.payMode === 'credit' ? 0 : form?.payMode === 'partial' ? Math.max(0, +form?.paidNow || 0) : total;
    return { fee, drugTotal, sub, vat, total, now, due: Math.max(0, total - now) };
  }, [form?.fee, form?.items, form?.payMode, form?.paidNow, settings.vatRate]);

  const partOk = form?.payMode !== 'partial' || (quote.now > 0 && quote.now < quote.total);

  async function submit() {
    if (busy || !form) return;
    if (!form.patient.trim()) { setError('The patient’s name is required'); return; }
    if (quote.total <= 0) { setError('Enter a fee, a drug, or both'); return; }
    if (!partOk) { setError('The part payment has to be more than zero and less than the total'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await api('/procedures', {
        method: 'POST',
        body: {
          type: form.type, patient: form.patient, phone: form.phone,
          fee: quote.fee, notes: form.notes,
          items: form.items.map((i) => ({ drugId: i.drugId, qty: i.qty })),
          payMode: form.payMode,
          paidNow: form.payMode === 'partial' ? quote.now : undefined
        }
      });
      setNotice(quote.due > 0
        ? `${res.procedure.pn} recorded — ${fmt(quote.now)} taken, ${fmt(quote.due)} on قرض. Billed on ${res.invoice.no}.`
        : `${res.procedure.pn} recorded — ${fmt(quote.total)} received. Billed on ${res.invoice.no}.`);
      setForm(null);
      setBill(res.invoice);
      load();
      api('/drugs').then(setDrugs).catch(() => {});
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function openBill(row) {
    setError('');
    try {
      const { invoice } = await api(`/procedures/${row._id}`);
      setBill(invoice);
    } catch (e) { setError(e.message); }
  }

  const q = search.trim().toLowerCase();
  const rows = (data?.rows || [])
    .filter((r) => tab === 'all' || r.type === tab)
    .filter((r) => !q || [r.pn, r.patient, r.phone, r.invoiceNo].some((v) => String(v || '').toLowerCase().includes(q)));

  const stats = data?.stats;
  const chosenDrug = drugs.find((x) => x._id === form?.drugId);

  return (
    <>
      <div className="page-head">
        <h1>{L.proc}</h1>
        <button onClick={openForm} className="btn btn-primary">+ New procedure</button>
      </div>

      {notice && <div className="banner banner-ok" style={{ marginBottom: 14 }}>{notice}</div>}
      {error && !form && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="label">{KHATNA} · this month</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{stats?.monthCounts?.[KHATNA] ?? 0}</div>
          <div className="stat-sub">{PROCEDURE_LABELS[KHATNA]}</div>
        </div>
        <div className="card">
          <div className="label">{TATBIQ} · this month</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{stats?.monthCounts?.[TATBIQ] ?? 0}</div>
          <div className="stat-sub">{PROCEDURE_LABELS[TATBIQ]}</div>
        </div>
        <div className="card">
          <div className="label">Received this month</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--green)' }}>{fmt(stats?.monthReceived || 0)}</div>
          <div className="stat-sub">
            Of {fmt(stats?.monthBilled || 0)} billed · {fmt(stats?.monthFees || 0)} fees, {fmt(stats?.monthDrugs || 0)} drugs
          </div>
        </div>
        <div className="card">
          <div className="label">Still owed</div>
          <div className="stat-value" style={{ fontSize: 20, color: stats?.outstanding ? 'var(--amber)' : 'var(--text)' }}>
            {fmt(stats?.outstanding || 0)}
          </div>
          <div className="stat-sub">Collect it from {L.loans}</div>
        </div>
      </div>

      <div className="row-between" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="segment">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={tab === k ? 'on' : ''}>{label}</button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by patient, PR # or invoice…"
          className="field" style={{ maxWidth: 320 }} />
      </div>

      <div className="table-wrap">
        {!loaded ? (
          <Loader label="Loading procedures…" />
        ) : !(data?.rows || []).length ? (
          <div className="empty">No procedures recorded yet. Use <strong>+ New procedure</strong> to bill a {KHATNA} or {TATBIQ}.</div>
        ) : rows.length === 0 ? (
          <div className="empty">Nothing matches your search.</div>
        ) : (
          <table className="data wide">
            <thead>
              <tr>
                <th>PR #</th><th>Date</th><th>Type</th><th>Patient</th>
                <th className="num">Fee</th><th className="num">Drugs</th><th className="num">Total</th>
                <th className="num">Received</th><th className="num">Owed</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.pn}</td>
                  <td style={{ color: 'var(--muted)' }}>{dateStr(r.date)}</td>
                  <td><span className="pill pill-blue">{r.type}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.patient}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.phone || r.invoiceNo}</div>
                  </td>
                  <td className="num tnum">{fmt(r.fee)}</td>
                  <td className="num tnum" style={{ color: 'var(--muted)' }}>{r.drugTotal ? fmt(r.drugTotal) : '—'}</td>
                  <td className="num tnum" style={{ fontWeight: 600 }}>{fmt(r.total)}</td>
                  <td className="num tnum" style={{ color: 'var(--green)' }}>{fmt(r.received)}</td>
                  <td className="num tnum" style={{ color: r.owed > 0 ? 'var(--amber)' : 'var(--faint)' }}>
                    {r.owed > 0 ? fmt(r.owed) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.missingInvoice ? (
                      <span className="pill pill-red">No bill</span>
                    ) : (
                      <button onClick={() => openBill(r)} className="btn btn-ghost btn-sm">Bill</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 12, maxWidth: 680 }}>
        Every procedure is billed as a normal sale, so the drugs used come off the shelf and the
        money reaches the cash book and the reports the same way a counter sale does. An unpaid
        balance becomes قرض on the patient&rsquo;s account — collect it from <strong>{L.loans}</strong>.
      </div>

      {form && (
        <div className="overlay">
          <div className="modal modal-lg">
            <h2>New procedure</h2>
            <div className="form-grid">
              <div className="segment" style={{ alignSelf: 'flex-start' }}>
                {PROCEDURE_TYPES.map((t) => (
                  <button key={t} onClick={() => setForm((f) => ({ ...f, type: t }))} className={form.type === t ? 'on' : ''}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="form-row">
                <input value={form.patient} onChange={set('patient')} placeholder="Patient name" className="field" />
                <input value={form.phone} onChange={set('phone')} placeholder="Phone (optional)" className="field" />
              </div>

              <div>
                <div className="field-label">Fee for the {form.type} itself</div>
                <input value={form.fee} onChange={set('fee')} type="number" min="0" placeholder="0" className="field" />
              </div>

              <div>
                <div className="field-label">Drugs used {drugs.length === 0 && '— inventory is empty'}</div>
                <div className="form-row">
                  <select value={form.drugId} onChange={set('drugId')} className="field" disabled={drugs.length === 0}>
                    {drugs.map((d) => (
                      <option key={d._id} value={d._id}>{d.name} · {fmt(d.sell)} · {d.stock} left</option>
                    ))}
                  </select>
                  <input value={form.drugQty} onChange={set('drugQty')} type="number" min="1" className="field"
                    style={{ flex: '0 0 80px', textAlign: 'right' }} />
                  <button onClick={addDrug} disabled={drugs.length === 0} className="btn btn-ghost" style={{ flex: '0 0 auto' }}>
                    + Add
                  </button>
                </div>
                {chosenDrug && stockLeft(chosenDrug) <= 0 && (
                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                    {chosenDrug.name} is out of stock.
                  </div>
                )}
              </div>

              {form.items.length > 0 && (
                <div>
                  {form.items.map((i) => (
                    <div key={i.drugId} className="list-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{i.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{i.qty} × {fmt(i.price)}</div>
                      </div>
                      <div className="tnum" style={{ fontSize: 13, fontWeight: 600 }}>{fmt(i.price * i.qty)}</div>
                      <button onClick={() => removeDrug(i.drugId)} aria-label={`Remove ${i.name}`}
                        style={{ border: 'none', background: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input value={form.notes} onChange={set('notes')} className="field"
                placeholder="Notes, e.g. follow-up in three days (optional)" />

              <div>
                <div className="field-label">Payment</div>
                <div className="segment">
                  <button onClick={() => setForm((f) => ({ ...f, payMode: 'cash' }))} className={form.payMode === 'cash' ? 'on' : ''}>Cash</button>
                  <button onClick={() => setForm((f) => ({ ...f, payMode: 'partial' }))} className={form.payMode === 'partial' ? 'on' : ''}>Part</button>
                  <button onClick={() => setForm((f) => ({ ...f, payMode: 'credit' }))} className={form.payMode === 'credit' ? 'on' : ''}>قرض</button>
                </div>
              </div>

              {form.payMode === 'partial' && (
                <input value={form.paidNow} onChange={set('paidNow')} type="number" min="0" className="field"
                  placeholder="How much the patient is paying now" />
              )}

              <div style={{ background: 'var(--blue-soft)', borderRadius: 12, padding: '10px 12px', fontSize: 12 }}>
                <div className="row-between"><div>Fee</div><div className="tnum">{fmt(quote.fee)}</div></div>
                <div className="row-between"><div>Drugs used</div><div className="tnum">{fmt(quote.drugTotal)}</div></div>
                {quote.vat > 0 && (
                  <div className="row-between" style={{ color: 'var(--muted)' }}>
                    <div>VAT {settings.vatRate}%</div><div className="tnum">{fmt(quote.vat)}</div>
                  </div>
                )}
                <div className="row-between" style={{ fontWeight: 700, marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                  <div>Total from patient</div><div className="tnum">{fmt(quote.total)}</div>
                </div>
                {quote.due > 0 && (
                  <div className="row-between" style={{ color: 'var(--amber)', fontWeight: 600, marginTop: 2 }}>
                    <div>Goes on قرض</div><div className="tnum">{fmt(quote.due)}</div>
                  </div>
                )}
              </div>

              {error && <div className="banner banner-error">{error}</div>}
            </div>

            <div className="modal-actions">
              <button onClick={() => setForm(null)} className="btn btn-cancel">Cancel</button>
              <button onClick={submit} disabled={busy || quote.total <= 0} className="btn btn-primary">
                {busy ? 'Saving…' : `Record & bill ${fmt(quote.total)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {bill && <InvoiceModal invoice={bill} onClose={() => setBill(null)} />}
    </>
  );
}
