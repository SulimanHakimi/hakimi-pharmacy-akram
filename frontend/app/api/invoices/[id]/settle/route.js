import { route, ok, fail, body } from '@/lib/route';
import { Invoice, Customer, Transaction, logAct } from '@/lib/models';
import { invoiceOwed } from '@/lib/ui';

export const dynamic = 'force-dynamic';

/**
 * Collect against one loan sale. A customer who bought on قرض — half or the whole
 * bill — comes back and pays; this records it against that invoice, takes the same
 * amount off their balance, and books the money as income the way a counter sale
 * does. Pass an amount for a part payment, or none to clear the sale outright.
 *
 * The customer's balance is the sum of what they owe across every sale, so paying
 * one invoice off in full leaves the balance at zero only when it was their only
 * outstanding loan.
 */
export const POST = route(async (request, { params, user }) => {
  const inv = await Invoice.findById(params.id);
  if (!inv) return fail('Invoice not found', 404);

  const owed = invoiceOwed(inv);
  if (owed <= 0) return fail('This sale is already paid off');

  const { amount } = await body(request);
  const blank = amount === undefined || amount === null || amount === '';
  const value = blank ? owed : +amount;
  if (!(value > 0)) return fail('Enter an amount to collect');
  if (value > owed + 0.5) return fail(`That is more than the ${Math.round(owed)} still owed on ${inv.no}`);

  // Anything within rounding of the balance closes the sale outright.
  const taken = Math.min(value, owed);
  inv.settled = (inv.settled || 0) + taken;
  await inv.save();

  const cleared = invoiceOwed(inv) <= 0;

  // The balance lives on the customer, so it has to come down by the same amount.
  // A sale recorded before the customer existed simply has no balance to reduce.
  const customer = await Customer.findOne({ name: inv.customer });
  if (customer) {
    customer.credit = Math.max(0, (customer.credit || 0) - taken);
    await customer.save();
  }

  await Transaction.create({
    type: 'Income', category: 'Credit repayment',
    desc: `Loan payment on ${inv.no} — ${inv.customer}${cleared ? '' : ' (part payment)'}`,
    amount: taken, auto: true, recordedBy: user.name
  });

  await logAct(user.name, `Collected ${Math.round(taken)} against ${inv.no}${cleared ? ' — loan cleared' : ''}`);
  return ok({ invoice: inv, cleared, owed: invoiceOwed(inv), customerCredit: customer?.credit ?? null });
  // Same reach as the Loan Sales screen this is driven from.
}, { perms: ['cust', 'fin'] });
