import { route, ok, fail, body } from '@/lib/route';
import { Transaction, Customer, Supplier, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

// Finance screen payload: cash book plus receivable and payable summaries.
export const GET = route(async () => {
  const [all, customers, suppliers] = await Promise.all([
    Transaction.find().sort({ t: -1 }),
    Customer.find({ credit: { $gt: 0 } }),
    Supplier.find({ balance: { $gt: 0 } })
  ]);

  const cash = all.reduce((t, x) => t + (x.type === 'Income' ? x.amount : -x.amount), 0);
  const cut30 = Date.now() - 30 * 864e5;
  const inc30 = all.filter((x) => x.type === 'Income' && x.t > cut30).reduce((t, x) => t + x.amount, 0);
  const exp30 = all.filter((x) => x.type === 'Expense' && x.t > cut30).reduce((t, x) => t + x.amount, 0);

  return ok({
    transactions: all.slice(0, 200),
    cash, inc30, exp30,
    receivables: customers.map((c) => ({ id: c._id, name: c.name, sub: c.phone, amount: c.credit })),
    payables: suppliers.map((s) => ({ id: s._id, name: s.name, sub: `Last order ${s.lastOrder}`, amount: s.balance }))
  });
}, { perms: ['fin'] });

export const POST = route(async (request, { user }) => {
  const { type, desc, amount } = await body(request);
  if (!desc?.trim() || !(+amount)) return fail('Description and amount are required');
  if (!['Income', 'Expense'].includes(type)) return fail('Invalid entry type');

  const tx = await Transaction.create({ type, desc: desc.trim(), amount: +amount });
  await logAct(user.name, `Recorded ${type.toLowerCase()}: ${tx.desc}`);
  return ok(tx, 201);
}, { perms: ['fin'] });
