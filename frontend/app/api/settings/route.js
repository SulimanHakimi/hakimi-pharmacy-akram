import { route, ok, fail, body } from '@/lib/route';
import { getSettings, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

// Currency, VAT, the low-stock threshold and the pharmacy details drive prices and
// printed documents everywhere, so any signed-in account may read them.
export const GET = route(async () => ok(await getSettings()));

export const PUT = route(async (request, { user }) => {
  const s = await getSettings();
  const b = await body(request);

  if (b.currency !== undefined) {
    if (!['AFN', 'USD', 'PKR'].includes(b.currency)) return fail('Unsupported currency');
    s.currency = b.currency;
  }
  if (b.vatRate !== undefined) s.vatRate = Math.max(0, Math.min(15, +b.vatRate || 0));
  if (b.lowStockThreshold !== undefined) s.lowStockThreshold = Math.max(1, Math.min(1000, +b.lowStockThreshold || 20));

  for (const k of ['pharmacyName', 'pharmacyAddress', 'pharmacyPhone', 'pharmacyLicense']) {
    if (b[k] !== undefined) s[k] = String(b[k]).trim();
  }
  if (b.pharmacyName !== undefined && !s.pharmacyName) return fail('Pharmacy name cannot be empty');

  await s.save();
  await logAct(user.name, 'Updated system settings');
  return ok(s);
}, { perms: ['set'] });
