'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { dateStr } from '@/lib/format';
import { warningsFor } from '@/lib/interactions';
import Loader from '@/components/Loader';

export default function PrescriptionsPage() {
  const { L, user, go } = useApp();
  const [rows, setRows] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ patient: '', doctor: '', drugId: '', drugs: [] });

  const load = () => api('/prescriptions').then(setRows).catch(() => {}).finally(() => setLoaded(true));
  useEffect(() => {
    load();
    api('/drugs').then(setDrugs).catch(() => {});
  }, []);

  function openForm() {
    setForm({ patient: '', doctor: '', drugId: drugs[0]?._id || '', drugs: [] });
    setError('');
    setShow(true);
  }

  function addDrug() {
    const d = drugs.find((x) => x._id === form.drugId);
    if (!d || form.drugs.includes(d.name)) return;
    setForm((f) => ({ ...f, drugs: [...f.drugs, d.name] }));
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api('/prescriptions', { method: 'POST', body: { patient: form.patient, doctor: form.doctor, drugs: form.drugs } });
      setShow(false);
      load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  // Dispensing hands the sale to the POS, where payment is taken.
  async function dispense(id) {
    setError('');
    try {
      const { pos } = await api(`/prescriptions/${id}/dispense`, { method: 'POST' });
      if (user?.perms?.pos) {
        sessionStorage.setItem('hp_pos_prefill', JSON.stringify(pos));
        go('/pos');
      } else {
        load();
      }
    } catch (e) { setError(e.message); }
  }

  const warns = warningsFor(form.drugs);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="page-head">
        <h1>{L.rx}</h1>
        <button onClick={openForm} className="btn btn-primary" disabled={drugs.length === 0}>+ New prescription</button>
      </div>

      {error && <div className="banner banner-error" style={{ marginBottom: 14 }}>{error}</div>}
      {loaded && drugs.length === 0 && (
        <div className="banner banner-error" style={{ marginBottom: 14 }}>Add drugs to inventory before recording prescriptions.</div>
      )}

      <div className="table-wrap">
        {!loaded ? (
          <Loader label="Loading prescriptions…" />
        ) : rows.length === 0 ? (
          <div className="empty">No prescriptions recorded yet.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Rx #</th><th>Date</th><th>Patient</th><th>Doctor</th><th>Drugs</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.rx}</td>
                  <td style={{ color: 'var(--muted)' }}>{dateStr(r.date)}</td>
                  <td style={{ fontWeight: 600 }}>{r.patient}</td>
                  <td>{r.doctor}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.drugs.join(', ')}</td>
                  <td><span className={`pill ${r.status === 'Pending' ? 'pill-amber' : 'pill-green'}`}>{r.status}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    {r.status === 'Pending' && (
                      <button onClick={() => dispense(r._id)} className="btn btn-primary btn-sm">Dispense</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {show && (
        <div className="overlay">
          <div className="modal modal-md">
            <h2>New prescription</h2>
            <div className="form-grid">
              <input value={form.patient} onChange={set('patient')} placeholder="Patient name" className="field" />
              <input value={form.doctor} onChange={set('doctor')} placeholder="Doctor name" className="field" />
              <div className="form-row">
                <select value={form.drugId} onChange={set('drugId')} className="field">
                  {drugs.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
                <button onClick={addDrug} className="btn btn-ghost" style={{ flex: '0 0 auto' }}>+ Add drug</button>
              </div>
              {form.drugs.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.drugs.map((n) => (
                    <span key={n} className="pill pill-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 10px' }}>
                      {n}
                      <button onClick={() => setForm((f) => ({ ...f, drugs: f.drugs.filter((x) => x !== n) }))}
                        aria-label={`Remove ${n}`}
                        style={{ border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              {warns.length > 0 && (
                <div style={{ background: 'var(--amber-soft)', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', marginBottom: 4 }}>⚠ Drug interaction check</div>
                  {warns.map((w) => <div key={w} style={{ fontSize: 11, color: '#7A5200', padding: '2px 0' }}>{w}</div>)}
                </div>
              )}
              {error && <div className="banner banner-error">{error}</div>}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShow(false)} className="btn btn-cancel">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save prescription'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
