import { route, ok } from '@/lib/route';
import { Drug, Transaction, getSettings } from '@/lib/models';
import { periodData, breakdown, monthsTo } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
  const q = new URL(request.url).searchParams;
  const type = ['sales', 'pl', 'invt'].includes(q.get('type')) ? q.get('type') : 'sales';
  const period = ['daily', 'weekly', 'monthly', 'yearly'].includes(q.get('period')) ? q.get('period') : 'daily';

  if (type === 'invt') {
    const settings = await getSettings();
    const low = settings.lowStockThreshold || 20;
    const drugs = await Drug.find();
    return ok({
      type, title: 'Inventory Report',
      range: 'As of ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      items: drugs.length,
      units: drugs.reduce((t, d) => t + d.stock, 0),
      buyValue: drugs.reduce((t, d) => t + d.buy * d.stock, 0),
      sellValue: drugs.reduce((t, d) => t + d.sell * d.stock, 0),
      lowCount: drugs.filter((d) => d.stock < low).length,
      expCount: drugs.filter((d) => monthsTo(d.expiry) <= 3).length,
      rows: [...drugs].sort((a, b) => b.buy * b.stock - a.buy * a.stock).slice(0, 10)
        .map((d) => ({ name: d.name, stock: d.stock, value: d.buy * d.stock }))
    });
  }

  const pd = await periodData(period);

  if (type === 'pl') {
    // Operating expenses are the real recorded expenses in the window, minus the
    // stock purchases already counted inside cost of goods sold.
    const expenses = await Transaction.find({ type: 'Expense', t: { $gte: pd.window.curFrom, $lt: pd.window.curTo } });
    const opEx = expenses
      .filter((e) => !/^(PO-|Supplier payment)/.test(e.desc))
      .reduce((t, e) => t + e.amount, 0);
    return ok({
      type, title: 'Profit & Loss Report', range: pd.range,
      revenue: pd.cur.rev, cogs: pd.cur.rev - pd.cur.profit, grossProfit: pd.cur.profit,
      opEx, netProfit: pd.cur.profit - opEx
    });
  }

  const titles = { daily: 'Daily Sales Report', weekly: 'Weekly Sales Report', monthly: 'Monthly Sales Report', yearly: 'Yearly Sales Report' };
  const b = await breakdown(pd.invoices);
  return ok({
    type, title: titles[period], range: pd.range,
    rev: pd.cur.rev, profit: pd.cur.profit, invs: pd.cur.invs,
    avg: pd.cur.invs ? pd.cur.rev / pd.cur.invs : 0,
    top: b.top, cats: b.cats
  });
}, { perms: ['ana'] });
