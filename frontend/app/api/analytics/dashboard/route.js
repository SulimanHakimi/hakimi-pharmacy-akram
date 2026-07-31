import { route, ok } from '@/lib/route';
import { Invoice, Drug, getSettings } from '@/lib/models';
import { midnight, monthsTo, totals } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const settings = await getSettings();
  const low = settings.lowStockThreshold || 20;
  const from = midnight(new Date());

  const [todayInvs, drugs] = await Promise.all([Invoice.find({ date: { $gte: from } }), Drug.find()]);
  const lowDrugs = drugs.filter((d) => d.stock < low).sort((a, b) => a.stock - b.stock);
  const expDrugs = drugs.filter((d) => monthsTo(d.expiry) <= 3).sort((a, b) => monthsTo(a.expiry) - monthsTo(b.expiry));
  const t = totals(todayInvs);

  return ok({
    sales: t.rev, invoiceCount: t.invs, profit: t.profit,
    lowCount: lowDrugs.length, expCount: expDrugs.length,
    lowList: lowDrugs.slice(0, 5).map((d) => ({ name: d.name, supplier: d.supplier, stock: d.stock })),
    expList: expDrugs.slice(0, 5).map((d) => ({ name: d.name, stock: d.stock, expiry: d.expiry }))
  });
}, { perms: ['dash'] });
