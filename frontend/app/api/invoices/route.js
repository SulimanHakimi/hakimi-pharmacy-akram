import { route, ok, fail, body } from '@/lib/route';
import { Drug, Invoice, Customer, Transaction, nextSeq, getSettings, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
  const limit = Math.min(+new URL(request.url).searchParams.get('limit') || 200, 500);
  return ok(await Invoice.find().sort({ date: -1 }).limit(limit));
}, { perms: ['sales', 'dash', 'pos'] });

// Complete a sale from the POS cart.
export const POST = route(async (request, { user }) => {
  const { items, customer, phone, doctor, discount, discMode, payMode } = await body(request);
  if (!Array.isArray(items) || !items.length) return fail('The cart is empty');
  if (!customer?.trim() || !phone?.trim()) return fail('Customer name and phone number are required');

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
  const payment = payMode === 'credit' ? 'Credit' : 'Cash';

  const seq = await nextSeq('invoice');
  const inv = await Invoice.create({
    no: `INV-${seq}`, date: new Date(),
    customer: customer.trim(), phone: phone.trim(), doctor: (doctor || '').trim(),
    items: invItems, sub, disc, vat, total, payment, servedBy: user.name
  });

  for (const { drug, qty } of lines) {
    await Drug.updateOne({ _id: drug._id }, { $inc: { stock: -qty } });
  }

  // Customers are created on their first purchase.
  const existing = await Customer.findOne({ $or: [{ phone: inv.phone }, { name: inv.customer }] });
  if (existing) {
    if (payment === 'Credit') { existing.credit += total; await existing.save(); }
  } else {
    await Customer.create({
      name: inv.customer, phone: inv.phone,
      since: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      credit: payment === 'Credit' ? total : 0
    });
  }

  if (payment === 'Cash') {
    await Transaction.create({ type: 'Income', desc: `Sale ${inv.no} — ${inv.customer}`, amount: total });
  }

  await logAct(user.name, `Completed ${payment.toLowerCase()} sale ${inv.no}`);
  return ok(inv, 201);
}, { perms: ['pos'] });
