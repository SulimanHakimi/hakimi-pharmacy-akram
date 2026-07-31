import { route, ok, fail } from '@/lib/route';
import { Prescription, Customer, Drug, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

// Mark dispensed and hand back what the POS needs to preload the sale.
export const POST = route(async (request, { params, user }) => {
  const p = await Prescription.findById(params.id);
  if (!p) return fail('Prescription not found', 404);
  if (p.status === 'Dispensed') return fail('Already dispensed');

  p.status = 'Dispensed';
  await p.save();
  await logAct(user.name, `Dispensed prescription ${p.rx}`);

  const cust = await Customer.findOne({ name: p.patient });
  const drugs = await Drug.find({ name: { $in: p.drugs }, stock: { $gt: 0 } });

  return ok({
    prescription: p,
    pos: {
      customer: p.patient,
      phone: cust ? cust.phone : '',
      doctor: p.doctor,
      items: drugs.map((d) => ({ drugId: d._id, qty: 1 }))
    }
  });
}, { perms: ['rx'] });
