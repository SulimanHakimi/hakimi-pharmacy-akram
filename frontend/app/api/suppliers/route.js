import { route, ok, fail, body } from '@/lib/route';
import { Supplier, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

// Names feed the add-drug and purchase-order pickers, so any signed-in account may read.
export const GET = route(async () => ok(await Supplier.find().sort({ name: 1 })));

export const POST = route(async (request, { user }) => {
  const { name, person, phone, address } = await body(request);
  if (!name?.trim()) return fail('Supplier name is required');
  if (await Supplier.findOne({ name: name.trim() })) return fail('A supplier with that name already exists');

  const s = await Supplier.create({
    name: name.trim(), person, phone, address, balance: 0, lastOrder: 'No orders yet'
  });
  await logAct(user.name, `Added supplier ${s.name}`);
  return ok(s, 201);
}, { perms: ['sup'] });
