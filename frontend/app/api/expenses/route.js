import { route, ok, fail, body } from '@/lib/route';
import { Transaction, logAct } from '@/lib/models';
import { ALL_EXPENSE_CATEGORIES, STOCK_CATEGORY, REFUND_CATEGORY } from '@/lib/labels';

export const dynamic = 'force-dynamic';

const monthStart = (back = 0) => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() - back, 1);
};

/**
 * Everything the pharmacy spends, read straight off the cash book so the totals
 * here and on the Finance screen can never drift apart. Stock bought from
 * suppliers books itself under STOCK_CATEGORY and is reported separately from
 * the running costs, which are the ones you can actually cut.
 */
export const GET = route(async (request) => {
  const months = Math.min(Math.max(+new URL(request.url).searchParams.get('months') || 12, 1), 36);
  const from = monthStart(months - 1);

  const rows = await Transaction.find({ type: 'Expense', t: { $gte: from } }).sort({ t: -1 });

  const thisMonth = monthStart(0);
  const lastMonth = monthStart(1);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const sum = (list) => list.reduce((total, x) => total + x.amount, 0);

  // Money refunded on a return is a reversed sale, not a cost the pharmacy bore,
  // so it stays out of both totals and only shows in the list itself.
  const running = rows.filter((x) => x.category !== STOCK_CATEGORY && x.category !== REFUND_CATEGORY);
  const stock = rows.filter((x) => x.category === STOCK_CATEGORY);
  const inMonth = (list, start, end) => list.filter((x) => x.t >= start && (!end || x.t < end));

  // Breakdown covers the running costs only — a single stock delivery would
  // otherwise dwarf every other line and make the split useless.
  const byCategory = {};
  for (const x of inMonth(running, thisMonth)) {
    byCategory[x.category] = (byCategory[x.category] || 0) + x.amount;
  }
  const catTotal = Object.values(byCategory).reduce((t, v) => t + v, 0);

  // Twelve calendar buckets so a quiet month reads as zero instead of vanishing.
  const buckets = Math.min(months, 12);
  const trend = Array.from({ length: buckets }, (_, k) => {
    const start = monthStart(buckets - 1 - k);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return {
      label: start.toLocaleDateString('en-GB', { month: 'short' }),
      running: sum(inMonth(running, start, end)),
      stock: sum(inMonth(stock, start, end))
    };
  });

  return ok({
    rows: rows.slice(0, 300),
    months,
    running: {
      month: sum(inMonth(running, thisMonth)),
      prevMonth: sum(inMonth(running, lastMonth, thisMonth)),
      ytd: sum(inMonth(running, yearStart))
    },
    stock: {
      month: sum(inMonth(stock, thisMonth)),
      ytd: sum(inMonth(stock, yearStart))
    },
    byCategory: Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount, pct: catTotal ? Math.round(amount / catTotal * 100) : 0 })),
    trend
  });
}, { perms: ['fin'] });

// A cost typed in by hand — rent, salaries, the electricity bill.
export const POST = route(async (request, { user }) => {
  const { category, desc, amount, t } = await body(request);
  const cat = (category || '').trim();
  if (!ALL_EXPENSE_CATEGORIES.includes(cat)) return fail('Choose a cost category');
  if (!desc?.trim()) return fail('Description is required');
  if (!(+amount > 0)) return fail('Amount must be more than zero');

  const when = t ? new Date(t) : new Date();
  if (Number.isNaN(when.getTime())) return fail('Invalid date');
  if (when > new Date(Date.now() + 864e5)) return fail('That date is in the future');

  const tx = await Transaction.create({
    type: 'Expense', category: cat, desc: desc.trim(), amount: +amount, t: when, recordedBy: user.name
  });
  await logAct(user.name, `Recorded ${cat.toLowerCase()} cost: ${tx.desc}`);
  return ok(tx, 201);
}, { perms: ['fin'] });
