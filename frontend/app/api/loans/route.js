import { route, ok } from '@/lib/route';
import { Invoice, Customer, Transaction } from '@/lib/models';
import { invoiceSplit, invoiceOwed } from '@/lib/ui';

export const dynamic = 'force-dynamic';

const DAY = 864e5;
const loaned = (inv) => invoiceSplit(inv).due;

/**
 * Everything sold on قرض. Each sale carries what it still owes, so a customer who
 * comes back to pay off one particular invoice can be handled on that row; the
 * balance on the customer record is the sum across their sales and is what a
 * general repayment clears.
 */
export const GET = route(async () => {
  const [sales, customers, repayments] = await Promise.all([
    // Part payments put money on قرض too. `payment: 'Credit'` also catches the
    // invoices written before the split existed, which carry no `due`.
    Invoice.find({ $or: [{ payment: { $in: ['Credit', 'Partial'] } }, { due: { $gt: 0 } }] })
      .sort({ date: -1 }).limit(400),
    Customer.find().sort({ name: 1 }),
    Transaction.find({ category: 'Credit repayment' }).sort({ t: -1 }).limit(200)
  ]);

  // Sales are tied to a customer by name — the counter no longer asks for a phone
  // number, so the name on the invoice is all there is to match on.
  const salesFor = (c) => sales.filter((i) => i.customer === c.name);

  const debtors = customers
    .filter((c) => c.credit > 0)
    .map((c) => {
      const own = salesFor(c);
      // Age the balance from the oldest sale still owing something, not from the
      // oldest credit sale — one that has been paid off says nothing about arrears.
      const unpaid = own.filter((i) => invoiceOwed(i) > 0);
      const oldest = unpaid.length ? unpaid[unpaid.length - 1].date : null;
      return {
        id: c._id,
        name: c.name,
        credit: c.credit,
        sales: own.length,
        openSales: unpaid.length,
        loaned: own.reduce((t, i) => t + loaned(i), 0),
        lastLoan: own.length ? own[0].date : null,
        oldestLoan: oldest,
        daysOld: oldest ? Math.floor((Date.now() - new Date(oldest).getTime()) / DAY) : null
      };
    })
    .sort((a, b) => b.credit - a.credit);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const cut30 = Date.now() - 30 * DAY;

  // `owed` is what the screen shows per row; `settled` is what has been collected
  // against that sale so far.
  const rows = sales.slice(0, 200).map((i) => ({ ...i.toObject(), owed: invoiceOwed(i) }));

  return ok({
    sales: rows,
    debtors,
    repayments,
    outstanding: debtors.reduce((t, d) => t + d.credit, 0),
    overdue: debtors.filter((d) => d.daysOld !== null && d.daysOld > 30).reduce((t, d) => t + d.credit, 0),
    loanedMonth: sales.filter((i) => i.date >= monthStart).reduce((t, i) => t + loaned(i), 0),
    repaidMonth: repayments.filter((r) => r.t >= monthStart).reduce((t, r) => t + r.amount, 0),
    loaned30: sales.filter((i) => i.date > cut30).reduce((t, i) => t + loaned(i), 0)
  });
}, { perms: ['cust', 'fin'] });
