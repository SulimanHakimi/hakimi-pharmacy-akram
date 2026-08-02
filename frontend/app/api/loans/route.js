import { route, ok } from '@/lib/route';
import { Invoice, Customer, Transaction } from '@/lib/models';

export const dynamic = 'force-dynamic';

const DAY = 864e5;

/**
 * Everything sold on نسیه. The outstanding balance lives on the customer, not on
 * the invoice — a repayment clears the balance rather than a specific sale — so
 * this returns the credit sales and the balances side by side and does not
 * pretend to know which individual invoice a payment settled.
 */
export const GET = route(async () => {
  const [sales, customers, repayments] = await Promise.all([
    Invoice.find({ payment: 'Credit' }).sort({ date: -1 }).limit(400),
    Customer.find().sort({ name: 1 }),
    Transaction.find({ category: 'Credit repayment' }).sort({ t: -1 }).limit(200)
  ]);

  // A customer is matched to a sale the same way the sale created them: on the
  // phone when there is one, otherwise on the name.
  const salesFor = (c) => sales.filter((i) => i.customer === c.name || (c.phone && i.phone === c.phone));

  const debtors = customers
    .filter((c) => c.credit > 0)
    .map((c) => {
      const own = salesFor(c);
      const oldest = own.length ? own[own.length - 1].date : null;
      return {
        id: c._id,
        name: c.name,
        phone: c.phone || '',
        credit: c.credit,
        sales: own.length,
        loaned: own.reduce((t, i) => t + i.total, 0),
        lastLoan: own.length ? own[0].date : null,
        oldestLoan: oldest,
        daysOld: oldest ? Math.floor((Date.now() - new Date(oldest).getTime()) / DAY) : null
      };
    })
    .sort((a, b) => b.credit - a.credit);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const cut30 = Date.now() - 30 * DAY;

  return ok({
    sales: sales.slice(0, 200),
    debtors,
    repayments,
    outstanding: debtors.reduce((t, d) => t + d.credit, 0),
    overdue: debtors.filter((d) => d.daysOld !== null && d.daysOld > 30).reduce((t, d) => t + d.credit, 0),
    loanedMonth: sales.filter((i) => i.date >= monthStart).reduce((t, i) => t + i.total, 0),
    repaidMonth: repayments.filter((r) => r.t >= monthStart).reduce((t, r) => t + r.amount, 0),
    loaned30: sales.filter((i) => i.date > cut30).reduce((t, i) => t + i.total, 0)
  });
}, { perms: ['cust', 'fin'] });
