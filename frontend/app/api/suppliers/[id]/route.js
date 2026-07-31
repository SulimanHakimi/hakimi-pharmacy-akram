import { route, ok, fail, body } from '@/lib/route';
import { Supplier, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

export const PUT = route(async (request, { params, user }) => {
  const s = await Supplier.findById(params.id);
  if (!s) return fail('Supplier not found', 404);

  const { name, person, phone, address } = await body(request);
  if (name?.trim()) s.name = name.trim();
  if (person !== undefined) s.person = person;
  if (phone !== undefined) s.phone = phone;
  if (address !== undefined) s.address = address;

  await s.save();
  await logAct(user.name, `Updated supplier ${s.name}`);
  return ok(s);
}, { perms: ['sup'] });
