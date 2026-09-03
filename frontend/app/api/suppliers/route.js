import { route, ok, fail, body } from '@/lib/route';
import { Supplier, Purchase, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

// Names feed the add-drug and purchase-order pickers, so any signed-in account may read.
// `purchased`/`orders` are the lifetime totals of what has been bought from each
// supplier, summed from the purchase orders and matched back on the supplier name.
export const GET = route(async () => {
  const [suppliers, bySupplier] = await Promise.all([
    Supplier.find().sort({ name: 1 }),
    Purchase.aggregate([{ $group: { _id: '$supplier', total: { $sum: '$total' }, orders: { $sum: 1 } } }])
  ]);
  const stats = Object.fromEntries(bySupplier.map((r) => [r._id, r]));
  return ok(suppliers.map((s) => ({
    ...s.toObject(),
    purchased: stats[s.name]?.total || 0,
    orders: stats[s.name]?.orders || 0
  })));
});

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
