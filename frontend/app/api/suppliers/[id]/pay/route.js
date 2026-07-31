import { route, ok, fail, body } from '@/lib/route';
import { Supplier, Transaction, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

// Pay down what the pharmacy owes a supplier; records the cash going out.
export const POST = route(async (request, { params, user }) => {
  const s = await Supplier.findById(params.id);
  if (!s) return fail('Supplier not found', 404);

  const { amount } = await body(request);
  const value = +amount || s.balance;
  if (value <= 0) return fail('Enter an amount to pay');
  if (value > s.balance) return fail(`That is more than the ${s.balance} outstanding`);

  s.balance -= value;
  await s.save();
  await Transaction.create({ type: 'Expense', desc: `Supplier payment — ${s.name}`, amount: value });
  await logAct(user.name, `Paid ${value} to ${s.name}`);
  return ok(s);
}, { perms: ['sup', 'fin'] });
