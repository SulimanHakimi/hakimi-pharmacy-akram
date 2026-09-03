import { route, ok, fail, body } from '@/lib/route';
import { Customer, Invoice, Transaction, logAct } from '@/lib/models';
import { invoiceOwed } from '@/lib/ui';

export const dynamic = 'force-dynamic';

/**
 * Collect a قرض balance and record the income. Pass an amount to take a part
 * payment; with no amount the whole outstanding balance is cleared.
 *
 * The customer just hands over money without naming a bill, so it is applied to
 * their open loan sales oldest first. The balance on the customer and the sales it
 * came from have to move together: leaving the sales alone would keep them reading
 * as unpaid on the Loan Sales screen, and taking goods back off one later would
 * cancel a debt that had already been paid.
 */
export const POST = route(async (request, { params, user }) => {
  const c = await Customer.findById(params.id);
  if (!c) return fail('Customer not found', 404);
  if (!c.credit) return fail('No credit owed');

  const { amount } = await body(request);
  const value = amount === undefined || amount === null || amount === '' ? c.credit : +amount;
  if (!(value > 0)) return fail('Enter an amount to collect');
  if (value > c.credit) return fail(`That is more than the ${Math.round(c.credit)} outstanding`);

  // Oldest arrears first, which is the order the money would be collected in
  // anyway. A balance left over belongs to no sale on record — a قرض carried in
  // from before the sales were tracked — and simply comes off the balance.
  const open = await Invoice.find({ customer: c.name }).sort({ date: 1 });
  let left = value;
  for (const inv of open) {
    if (left <= 0) break;
    const owed = invoiceOwed(inv);
    if (owed <= 0) continue;
    const take = Math.min(owed, left);
    inv.settled = (inv.settled || 0) + take;
    await inv.save();
    left -= take;
  }

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
