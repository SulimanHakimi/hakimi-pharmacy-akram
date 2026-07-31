import { route, ok, fail, body } from '@/lib/route';
import { Drug, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

// The POS grid and every drug picker need this, so any signed-in account may read it.
export const GET = route(async () => ok(await Drug.find().sort({ name: 1 })));

function validateDrug({ name, buy, sell, expiry }) {
  if (!name?.trim()) return 'Drug name is required';
  if (!(+buy) || +buy <= 0) return 'Buy price is required';
  if (!(+sell) || +sell <= 0) return 'Sell price is required';
  if (+sell < +buy) return 'Sell price is below the buy price';
  if (expiry && !/^\d{4}-\d{2}$/.test(expiry)) return 'Expiry must be a month';
  return null;
}

export const POST = route(async (request, { user }) => {
  const b = await body(request);
  const bad = validateDrug(b);
  if (bad) return fail(bad);
  if (b.barcode?.trim() && await Drug.findOne({ barcode: b.barcode.trim() })) {
    return fail('That barcode is already used by another drug');
  }

  const drug = await Drug.create({
    name: b.name.trim(), category: b.category || 'Other', supplier: b.supplier || '',
    buy: +b.buy, sell: +b.sell, stock: Math.max(0, Math.floor(+b.stock) || 0),
    expiry: b.expiry || '2099-12',
    batch: b.batch?.trim() || '', barcode: b.barcode?.trim() || ''
  });
  await logAct(user.name, `Added drug ${drug.name}`);
  return ok(drug, 201);
}, { perms: ['inv'] });
