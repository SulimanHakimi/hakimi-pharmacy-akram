import { route, ok, fail, body } from '@/lib/route';
import { Drug, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

function validate({ name, buy, sell, expiry }) {
  if (!name?.trim()) return 'Drug name is required';
  if (!(+buy) || +buy <= 0) return 'Buy price is required';
  if (!(+sell) || +sell <= 0) return 'Sell price is required';
  if (+sell < +buy) return 'Sell price is below the buy price';
  if (expiry && !/^\d{4}-\d{2}$/.test(expiry)) return 'Expiry must be a month';
  return null;
}

export const PUT = route(async (request, { params, user }) => {
  const drug = await Drug.findById(params.id);
  if (!drug) return fail('Drug not found', 404);

  const b = await body(request);
  const bad = validate({ name: b.name ?? drug.name, buy: b.buy ?? drug.buy, sell: b.sell ?? drug.sell, expiry: b.expiry });
  if (bad) return fail(bad);

  for (const k of ['name', 'category', 'supplier', 'expiry', 'batch', 'barcode']) {
    if (b[k] !== undefined) drug[k] = typeof b[k] === 'string' ? b[k].trim() : b[k];
  }
  for (const k of ['buy', 'sell']) if (b[k] !== undefined) drug[k] = +b[k];
  if (b.stock !== undefined) drug.stock = Math.max(0, Math.floor(+b.stock) || 0);

  await drug.save();
  await logAct(user.name, `Updated drug ${drug.name}`);
  return ok(drug);
}, { perms: ['invEdit'] });

// Deleting is the super admin's alone — a drug taken out of the catalogue can no
// longer be matched by a return or a stock movement that refers to it by name.
export const DELETE = route(async (request, { params, user }) => {
  const drug = await Drug.findById(params.id);
  if (!drug) return fail('Drug not found', 404);
  if (drug.stock > 0) return fail('Cannot remove a drug that still has stock');
  await drug.deleteOne();
  await logAct(user.name, `Removed drug ${drug.name}`);
  return ok({ ok: true });
}, { superAdmin: true });
