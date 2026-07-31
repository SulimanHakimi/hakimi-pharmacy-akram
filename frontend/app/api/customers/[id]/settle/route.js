import { route, ok, fail } from '@/lib/route';
import { Customer, Transaction, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

// Collect an outstanding نسیه balance: zero the credit and record the income.
export const POST = route(async (request, { params, user }) => {
  const c = await Customer.findById(params.id);
  if (!c) return fail('Customer not found', 404);
  if (!c.credit) return fail('No credit owed');

  const amount = c.credit;
  c.credit = 0;
  await c.save();
  await Transaction.create({ type: 'Income', desc: `Credit repayment — ${c.name}`, amount });
  await logAct(user.name, `Received credit repayment from ${c.name}`);
  return ok(c);
}, { perms: ['cust', 'fin'] });
