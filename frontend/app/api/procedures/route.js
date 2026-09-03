import { route, ok, fail, body } from '@/lib/route';
import { Procedure, Invoice, Drug, Customer, Transaction, Counter, nextSeq, getSettings, logAct } from '@/lib/models';
import { PROCEDURE_TYPES, serviceLineName } from '@/lib/labels';
import { invoiceSplit, invoiceOwed } from '@/lib/ui';

export const dynamic = 'force-dynamic';

const DAY = 864e5;

/**
 * The procedure register, with what each patient has actually paid read off the
 * sale rather than copied onto the record — a قرض collected later on the Loan
 * Sales screen moves the invoice, and this has to follow it.
 */
export const GET = route(async () => {
  const rows = await Procedure.find().sort({ date: -1 }).limit(300);

  const invoices = await Invoice.find({ _id: { $in: rows.map((r) => r.invoice) } });
  const byId = Object.fromEntries(invoices.map((i) => [i._id.toString(), i]));

  const list = rows.map((r) => {
    const inv = byId[r.invoice?.toString()];
    const split = inv ? invoiceSplit(inv) : { paid: 0, due: 0 };
    const owed = inv ? invoiceOwed(inv) : 0;
    return {
      ...r.toObject(),
      // What has reached the till on this procedure: taken at the time, plus
      // anything collected against the قرض since.
      received: split.paid + (inv?.settled || 0),
      owed,
      payment: inv?.payment || 'Cash',
      // A deleted invoice would leave the register unable to say what was paid.
      missingInvoice: !inv
    };
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const cut30 = Date.now() - 30 * DAY;
  const inMonth = list.filter((r) => new Date(r.date) >= monthStart);
  const countOf = (type) => inMonth.filter((r) => r.type === type).length;

  return ok({
    rows: list,
    stats: {
      // Keyed by the Dari type so the screen can look a count up directly.
      monthCounts: Object.fromEntries(PROCEDURE_TYPES.map((t) => [t, countOf(t)])),
      monthBilled: inMonth.reduce((t, r) => t + r.total, 0),
      monthReceived: inMonth.reduce((t, r) => t + r.received, 0),
      monthFees: inMonth.reduce((t, r) => t + r.fee, 0),
      monthDrugs: inMonth.reduce((t, r) => t + r.drugTotal, 0),
      outstanding: list.reduce((t, r) => t + r.owed, 0),
      count30: list.filter((r) => new Date(r.date).getTime() > cut30).length
    }
  });
}, { perms: ['proc'] });

/**
 * Record a ختنه or تطبیق. The fee and the drugs used go onto one invoice, so the
 * patient gets a single bill and the pharmacy gets a single figure in the reports:
 * stock comes off the shelf for the drugs, the money taken lands in the cash book
 * as a sale, and anything left unpaid becomes قرض on the patient's account, to be
 * collected from the Loan Sales screen like any other credit sale.
 */
export const POST = route(async (request, { user }) => {
  const { type, patient, phone, fee, items, notes, payMode, paidNow } = await body(request);

  if (!PROCEDURE_TYPES.includes(type)) return fail('Choose ختنه or تطبیق');
  const name = (patient || '').trim();
  if (!name) return fail('The patient’s name is required — the bill has to belong to somebody');

  const feeValue = +fee || 0;
  if (feeValue < 0) return fail('The fee cannot be negative');

  // Drugs are optional: a تطبیق where the patient brought their own medicine is
  // just a fee, and a procedure billed only for the drugs used is a zero fee.
  const chosen = Array.isArray(items) ? items : [];
  const lines = [];
  for (const it of chosen) {
    const qty = Math.floor(+it.qty);
    if (!qty || qty < 1) continue;
    const d = await Drug.findById(it.drugId);
    if (!d) return fail('One of the drugs is no longer in the inventory');
    if (d.stock < qty) return fail(`Not enough stock for ${d.name} (${d.stock} left)`);
    lines.push({ drug: d, qty });
  }

  const drugTotal = lines.reduce((t, { drug, qty }) => t + drug.sell * qty, 0);
  if (feeValue <= 0 && drugTotal <= 0) return fail('Enter a fee, a drug, or both — the bill is empty');

  const settings = await getSettings();

  // The fee rides as its own line, flagged so no stock is looked for against it and
  // the best-seller lists do not treat it as a drug. It has no buy price, so the
  // whole fee reads as margin — which is what a service is.
  const invItems = lines.map(({ drug, qty }) => ({
    name: drug.name, qty, price: drug.sell, buy: drug.buy, service: false
  }));
  if (feeValue > 0) {
    invItems.push({ name: serviceLineName(type), qty: 1, price: feeValue, buy: 0, service: true });
  }

  const sub = invItems.reduce((t, i) => t + i.price * i.qty, 0);
  const vat = sub * (settings.vatRate || 0) / 100;
  const total = sub + vat;

  // Same three ways to settle as the counter: all cash, all on قرض, or part now.
  let paid, due;
  if (payMode === 'credit') {
    paid = 0; due = total;
  } else if (payMode === 'partial') {
    paid = +paidNow;
    if (!(paid > 0)) return fail('Enter how much the patient is paying now');
    if (paid >= total) return fail('That covers the whole bill — record it as a cash payment');
    due = total - paid;
    // Under one unit of currency is VAT rounding, not a debt.
    if (due < 1) { paid = total; due = 0; }
  } else {
    paid = total; due = 0;
  }
  const payment = due <= 0 ? 'Cash' : paid > 0 ? 'Partial' : 'Credit';

  const inv = await Invoice.create({
    no: `INV-${await nextSeq('invoice')}`, date: new Date(),
    customer: name, doctor: '',
    items: invItems, sub, disc: 0, vat, total,
    payment, paid, due, settled: 0, servedBy: user.name
  });

  for (const { drug, qty } of lines) {
    await Drug.updateOne({ _id: drug._id }, { $inc: { stock: -qty } });
  }

  // A patient is a customer like any other, so an unpaid balance goes on the same
  // account the قرض screens already collect from.
  const existing = await Customer.findOne({ name });
  if (existing) {
    if (due > 0) { existing.credit += due; await existing.save(); }
  } else {
    await Customer.create({
      name,
      since: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      credit: due
    });
  }

  if (paid > 0) {
    await Transaction.create({
      type: 'Income', category: 'Sales',
      desc: `${type} ${inv.no} — ${name}${due > 0 ? ' (part payment)' : ''}`,
      amount: paid, auto: true, recordedBy: user.name
    });
  }

  await Counter.updateOne({ key: 'procedure' }, { $setOnInsert: { seq: 1000 } }, { upsert: true });
  const proc = await Procedure.create({
    pn: `PR-${await nextSeq('procedure')}`,
    type, patient: name, phone: (phone || '').trim(), date: inv.date,
    fee: feeValue, drugTotal, total,
    invoiceNo: inv.no, invoice: inv._id,
    notes: (notes || '').trim(), servedBy: user.name
  });

  await logAct(user.name, `Recorded ${type} ${proc.pn} for ${name} — billed on ${inv.no}`);
  return ok({ procedure: proc, invoice: inv }, 201);
}, { perms: ['proc'] });
