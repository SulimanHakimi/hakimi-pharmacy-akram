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

export function expStr(exp) {
  const [y, m] = exp.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function monthsTo(exp) {
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

export function todayStr() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
