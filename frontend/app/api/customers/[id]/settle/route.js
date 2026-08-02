import { route, ok, fail, body } from '@/lib/route';
import { Customer, Transaction, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

// Collect a قرض balance and record the income. Pass an amount to take a part
// payment; with no amount the whole outstanding balance is cleared.
export const POST = route(async (request, { params, user }) => {
  const c = await Customer.findById(params.id);
  if (!c) return fail('Customer not found', 404);
  if (!c.credit) return fail('No credit owed');

  const { amount } = await body(request);
  const value = amount === undefined || amount === null || amount === '' ? c.credit : +amount;
  if (!(value > 0)) return fail('Enter an amount to collect');
  if (value > c.credit) return fail(`That is more than the ${Math.round(c.credit)} outstanding`);

  c.credit = Math.max(0, c.credit - value);
  await c.save();

  const partial = c.credit > 0;
  await Transaction.create({
    type: 'Income', category: 'Credit repayment',
    desc: `Credit repayment — ${c.name}${partial ? ' (part payment)' : ''}`,
    amount: value, auto: true, recordedBy: user.name
  });
  await logAct(user.name, `Received ${Math.round(value)} credit repayment from ${c.name}`);
  return ok(c);
}, { perms: ['cust', 'fin'] });
