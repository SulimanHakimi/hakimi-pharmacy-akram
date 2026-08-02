import { route, ok, fail, body } from '@/lib/route';
import { Return, Invoice, Drug, Customer, Transaction, Counter, nextSeq, logAct } from '@/lib/models';
import { REFUND_CATEGORY } from '@/lib/labels';

export const dynamic = 'force-dynamic';

// How much of each line has already come back, so the same box cannot be
// refunded twice.
async function returnedQty(invoiceId) {
  const past = await Return.find({ invoice: invoiceId });
  const map = {};
  for (const r of past) for (const it of r.items) map[it.name] = (map[it.name] || 0) + it.qty;
  return map;
}

export const GET = route(async (request) => {
  const invoice = new URL(request.url).searchParams.get('invoice');
  if (invoice) {
    const rows = await Return.find({ invoice }).sort({ date: -1 });
    return ok({ rows, returned: await returnedQty(invoice) });
  }
  return ok({ rows: await Return.find().sort({ date: -1 }).limit(200) });
}, { perms: ['sales', 'pos', 'fin'] });

/**
 * Take drugs back from a customer. The sale is reversed rather than written off:
 * sellable stock goes back on the shelf and the money value is netted out of
 * revenue and cost of goods sold by the analytics, so a return costs the
 * pharmacy nothing beyond the sale it undoes.
 *
 * The customer is paid back off their قرض first — refunding cash to someone who
 * still owes for the same bill would just grow the debt.
 */
export const POST = route(async (request, { user }) => {
  const { invoiceId, items, reason, restock } = await body(request);

  const inv = await Invoice.findById(invoiceId);
  if (!inv) return fail('Invoice not found', 404);
  if (!Array.isArray(items) || !items.length) return fail('Choose at least one drug to take back');

  const already = await returnedQty(inv._id);

  const lines = [];
  for (const it of items) {
    const qty = Math.floor(+it.qty);
    if (!qty || qty < 1) continue;

    const sold = inv.items.find((x) => x.name === it.name);
    if (!sold) return fail(`${it.name} is not on invoice ${inv.no}`);

    const left = sold.qty - (already[it.name] || 0);
    if (qty > left) {
      return fail(left > 0
        ? `Only ${left} of ${sold.name} can still be returned on ${inv.no}`
        : `${sold.name} has already been fully returned on ${inv.no}`);
    }
    lines.push({ name: sold.name, qty, price: sold.price, buy: sold.buy });
  }
  if (!lines.length) return fail('Enter a quantity to take back');

  const amount = lines.reduce((t, l) => t + l.price * l.qty, 0);

  // Clear what this customer still owes before paying any cash out.
  const match = inv.phone ? [{ phone: inv.phone }, { name: inv.customer }] : [{ name: inv.customer }];
  const customer = await Customer.findOne({ $or: match });
  const creditCleared = customer ? Math.min(amount, customer.credit || 0) : 0;
  const refunded = amount - creditCleared;

  const putBack = restock !== false;

  await Counter.updateOne({ key: 'return' }, { $setOnInsert: { seq: 1000 } }, { upsert: true });
  const seq = await nextSeq('return');

  const ret = await Return.create({
    rn: `RN-${seq}`, invoiceNo: inv.no, invoice: inv._id, date: new Date(),
    customer: inv.customer, phone: inv.phone, items: lines,
    amount, creditCleared, refunded, restocked: putBack,
    reason: (reason || '').trim(), servedBy: user.name
  });

  // Back on the shelf. A drug deleted from the catalogue since the sale is simply
  // skipped — there is no record left to add the stock to.
  if (putBack) {
    for (const l of lines) {
      await Drug.updateOne({ name: l.name }, { $inc: { stock: l.qty } });
    }
  }

  if (creditCleared > 0) {
    customer.credit = Math.max(0, customer.credit - creditCleared);
    await customer.save();
  }

  // Cash leaving the till. Categorised as a refund so the costs screen and the
  // profit and loss report keep it out of the pharmacy's running costs.
  if (refunded > 0) {
    await Transaction.create({
      type: 'Expense', category: REFUND_CATEGORY,
      desc: `Refund ${ret.rn} — ${inv.customer} (${inv.no})`,
      amount: refunded, auto: true, recordedBy: user.name
    });
  }

  await logAct(user.name, `Refunded ${ret.rn} against ${inv.no}${putBack ? '' : ' (not restocked)'}`);
  return ok(ret, 201);
}, { perms: ['sales', 'pos', 'fin'] });
