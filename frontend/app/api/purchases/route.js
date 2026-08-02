import { route, ok, fail, body } from '@/lib/route';
import { Purchase, Drug, Supplier, Transaction, nextSeq, logAct } from '@/lib/models';
import { STOCK_CATEGORY } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export const GET = route(async () => ok(await Purchase.find().sort({ date: -1 }).limit(200)), { perms: ['pur'] });

// Receive a purchase order: stock and buy price update immediately. Paying on the
// spot books the expense; otherwise the amount is added to what we owe the supplier.
export const POST = route(async (request, { user }) => {
  const { supplier, drugId, qty, cost, paid } = await body(request);
  const q = Math.floor(+qty), c = +cost;
  if (!q || q < 1 || !c || c <= 0) return fail('Quantity and unit buy price are required');

  const drug = await Drug.findById(drugId);
  if (!drug) return fail('Drug not found', 404);
  const sup = await Supplier.findOne({ name: supplier });
  if (!sup) return fail('Supplier not found', 404);

  const total = q * c;
  const seq = await nextSeq('po');
  const po = await Purchase.create({
    po: `PO-${String(seq).padStart(4, '0')}`, supplier: sup.name, date: new Date(),
    items: 1, total, status: 'Received'
  });

  drug.stock += q;
  drug.buy = c;
  await drug.save();

  sup.lastOrder = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (paid) {
    await Transaction.create({
      type: 'Expense', category: STOCK_CATEGORY, desc: `${po.po} payment — ${sup.name}`,
      amount: total, auto: true, recordedBy: user.name
    });
  } else {
    sup.balance += total;
  }
  await sup.save();

  await logAct(user.name, `Received purchase order ${po.po} from ${sup.name}`);
  return ok(po, 201);
}, { perms: ['pur'] });
