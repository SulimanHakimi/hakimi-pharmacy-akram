import { Invoice, Drug } from './models';

const DAY = 864e5;
const dm = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const dmy = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function monthsTo(exp) {
  const [y, m] = String(exp).split('-').map(Number), n = new Date();
  return (y - n.getFullYear()) * 12 + (m - 1 - n.getMonth());
}

export function totals(invoices) {
  return invoices.reduce((a, i) => ({
    rev: a.rev + i.total,
    profit: a.profit + i.items.reduce((t, it) => t + (it.price - it.buy) * it.qty, 0) - (i.disc || 0),
    invs: a.invs + 1
  }), { rev: 0, profit: 0, invs: 0 });
}

// Calendar windows — never row counts, because days without sales have no rows.
export function windowFor(period) {
  const today = midnight(new Date());
  const days = { daily: 1, weekly: 7, monthly: 30, yearly: 365 }[period];
  const curFrom = new Date(today.getTime() - (days - 1) * DAY);
  const curTo = new Date(today.getTime() + DAY);
  return { days, curFrom, curTo, prevFrom: new Date(curFrom.getTime() - days * DAY), prevTo: curFrom };
}

// Fixed calendar slices, so a stretch with no sales shows as a zero bar.
function buildBars(period, invoices) {
  const today = midnight(new Date());
  const sum = (from, to) => invoices
    .filter((i) => i.date >= from && i.date < to)
    .reduce((t, i) => t + i.total, 0);

  if (period === 'daily') {
    return Array.from({ length: 14 }, (_, k) => {
      const from = new Date(today.getTime() - (13 - k) * DAY);
      return { label: String(from.getDate()), v: sum(from, new Date(from.getTime() + DAY)), t: from.getTime() };
    });
  }
  if (period === 'weekly') {
    return Array.from({ length: 12 }, (_, k) => {
      const from = new Date(today.getTime() - (11 - k) * 7 * DAY - 6 * DAY);
      return { label: dm(from), v: sum(from, new Date(from.getTime() + 7 * DAY)), t: from.getTime() };
    });
  }
  const months = period === 'monthly' ? 6 : 12;
  return Array.from({ length: months }, (_, k) => {
    const from = new Date(today.getFullYear(), today.getMonth() - (months - 1 - k), 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    return { label: from.toLocaleDateString('en-GB', { month: 'short' }), v: sum(from, to), t: from.getTime() };
  });
}

// Real top sellers and category mix, straight from the invoice lines in the window.
export async function breakdown(invoices) {
  const drugs = await Drug.find().select('name category');
  const categoryOf = Object.fromEntries(drugs.map((d) => [d.name, d.category]));

  const units = {}, revenue = {}, cats = {};
  for (const inv of invoices) {
    for (const it of inv.items) {
      units[it.name] = (units[it.name] || 0) + it.qty;
      revenue[it.name] = (revenue[it.name] || 0) + it.price * it.qty;
      const c = categoryOf[it.name] || 'Uncategorised';
      cats[c] = (cats[c] || 0) + it.price * it.qty;
    }
  }

  const ranked = Object.keys(revenue).sort((a, b) => revenue[b] - revenue[a]);
  const topNames = ranked.slice(0, 5);
  const catTotal = Object.values(cats).reduce((t, v) => t + v, 0);

  return {
    top: topNames.map((name, i) => ({ rank: i + 1, name, units: units[name], rev: revenue[name] })),
    slow: ranked.slice(-3).reverse()
      .filter((name) => !topNames.includes(name))
      .map((name) => ({ name, units: units[name], rev: revenue[name] })),
    cats: Object.entries(cats).sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount, pct: catTotal ? Math.round(amount / catTotal * 100) : 0 }))
  };
}

export async function periodData(period) {
  const w = windowFor(period);
  const [curInvoices, prevInvoices, barSource] = await Promise.all([
    Invoice.find({ date: { $gte: w.curFrom, $lt: w.curTo } }),
    Invoice.find({ date: { $gte: w.prevFrom, $lt: w.prevTo } }),
    Invoice.find({ date: { $gte: new Date(midnight(new Date()).getTime() - 400 * DAY) } }).select('date total')
  ]);

  const titles = {
    daily: 'Revenue — last 14 days', weekly: 'Revenue — last 12 weeks',
    monthly: 'Revenue — last 6 months', yearly: 'Revenue — last 12 months'
  };
  const ranges = {
    daily: 'Today, ' + dmy(w.curFrom),
    weekly: 'Last 7 days, ' + dm(w.curFrom) + ' – ' + dm(new Date(w.curTo - DAY)),
    monthly: 'Last 30 days, ' + dm(w.curFrom) + ' – ' + dm(new Date(w.curTo - DAY)),
    yearly: 'Last 365 days, ' + dmy(w.curFrom) + ' – ' + dmy(new Date(w.curTo - DAY))
  };

  return {
    cur: totals(curInvoices), prev: totals(prevInvoices),
    bars: buildBars(period, barSource),
    title: titles[period], range: ranges[period],
    invoices: curInvoices, window: w
  };
}
