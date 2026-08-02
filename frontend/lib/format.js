export function makeFmt(currency) {
  return (n) => (currency || 'AFN') + ' ' + Math.round(n || 0).toLocaleString('en-US');
}

export function fmtK(n) {
  return n >= 100000 ? Math.round(n / 1000) + 'k' : n >= 10000 ? (n / 1000).toFixed(1) + 'k' : Math.round(n).toLocaleString('en-US');
}

export function dateStr(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Expiry is optional, so a blank value reads as a dash and never counts as expiring.
export function expStr(exp) {
  if (!exp) return '—';
  const [y, m] = exp.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function monthsTo(exp) {
  if (!exp) return Infinity;
  const [y, m] = exp.split('-').map(Number), n = new Date();
  return (y - n.getFullYear()) * 12 + (m - 1 - n.getMonth());
}

export function dm(t) {
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function ago(t) {
  const m = Math.round((Date.now() - new Date(t).getTime()) / 6e4);
  return m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago';
}

/**
 * The date as it prints on the Dari invoice: the Afghan solar calendar, with Latin
 * digits so it reads the same way as the money beside it.
 *
 * A browser whose ICU data does not carry the Persian calendar falls back to the
 * English date rather than printing nothing.
 */
export function dariDate(iso) {
  const d = new Date(iso);
  try {
    return d.toLocaleDateString('fa-AF-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

export function todayStr() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
