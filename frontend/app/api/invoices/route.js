import { route, ok, fail, body } from '@/lib/route';
import { Drug, Invoice, Customer, Transaction, nextSeq, getSettings, logAct, WALK_IN } from '@/lib/models';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
  const limit = Math.min(+new URL(request.url).searchParams.get('limit') || 200, 500);
  return ok(await Invoice.find().sort({ date: -1 }).limit(limit));
}, { perms: ['sales', 'dash', 'pos'] });

// Complete a sale from the POS cart.
export const POST = route(async (request, { user }) => {
  const { items, customer, doctor, discount, discMode, payMode, paidNow } = await body(request);
  if (!Array.isArray(items) || !items.length) return fail('The cart is empty');

  // A cash sale does not need a name — most walk-ins do not give one. A sale that
  // puts money on قرض does, because there has to be somebody to collect it from.
  const named = (customer || '').trim();
  const onCredit = payMode === 'credit' || payMode === 'partial';
  if (onCredit && !named) return fail('A قرض sale needs the customer’s name so the balance can be collected');

  const settings = await getSettings();

  const lines = [];
  for (const it of items) {
    const d = await Drug.findById(it.drugId);
    const qty = Math.floor(+it.qty);
    if (!d || !qty || qty < 1) return fail('Invalid cart item');
    if (d.stock < qty) return fail(`Not enough stock for ${d.name} (${d.stock} left)`);
    lines.push({ drug: d, qty });
  }

  const invItems = lines.map(({ drug, qty }) => ({ name: drug.name, qty, price: drug.sell, buy: drug.buy }));
  const sub = invItems.reduce((t, i) => t + i.price * i.qty, 0);
  const dv = +discount || 0;
  const disc = dv <= 0 ? 0 : Math.min(discMode === 'amt' ? dv : sub * Math.min(dv, 100) / 100, sub);
  const vat = (sub - disc) * (settings.vatRate || 0) / 100;
  const total = sub - disc + vat;

  // Three ways to settle a sale: all cash, all on قرض, or part now and the rest on
  // قرض. A leftover under one unit of currency is rounding from a percentage
  // discount or VAT, not a real debt, so it is treated as paid in full.
  let paid, due;
  if (payMode === 'credit') {
    paid = 0; due = total;
  } else if (payMode === 'partial') {
    paid = +paidNow;
    if (!(paid > 0)) return fail('Enter how much the customer is paying now');
    if (paid >= total) return fail('That covers the whole bill — record it as a cash sale');
    due = total - paid;
    if (due < 1) { paid = total; due = 0; }
  } else {
    paid = total; due = 0;
  }
  const payment = due <= 0 ? 'Cash' : paid > 0 ? 'Partial' : 'Credit';

  const seq = await nextSeq('invoice');
  const inv = await Invoice.create({
    no: `INV-${seq}`, date: new Date(),
    customer: named || WALK_IN, doctor: (doctor || '').trim(),
    items: invItems, sub, disc, vat, total, payment, paid, due, settled: 0, servedBy: user.name
  });

  for (const { drug, qty } of lines) {
    await Drug.updateOne({ _id: drug._id }, { $inc: { stock: -qty } });
  }

  // Customers are created on their first purchase, matched on the name they gave.
  // An unnamed cash sale is nobody in particular, so it does not open an account.
  if (named) {
    const existing = await Customer.findOne({ name: named });
    if (existing) {
      if (due > 0) { existing.credit += due; await existing.save(); }
    } else {
      await Customer.create({
        name: named,
        since: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        credit: due
      });
    }
  }

  // Only the money actually taken reaches the cash book; the rest is a receivable
  // and is booked as income when the customer settles it.
  if (paid > 0) {
    await Transaction.create({
      type: 'Income', category: 'Sales',
      desc: `Sale ${inv.no} — ${inv.customer}${due > 0 ? ' (part payment)' : ''}`,
      amount: paid, auto: true, recordedBy: user.name
    });
  }

  await logAct(user.name, `Completed ${payment.toLowerCase()} sale ${inv.no}`);
  return ok(inv, 201);
}, { perms: ['pos'] });
