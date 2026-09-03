import { route, ok, fail } from '@/lib/route';
import { Procedure, Invoice } from '@/lib/models';

export const dynamic = 'force-dynamic';

// One procedure with the sale it was billed on, so the register can print the
// patient's bill without the list having to carry every invoice.
export const GET = route(async (request, { params }) => {
  const proc = await Procedure.findById(params.id);
  if (!proc) return fail('Procedure not found', 404);

  const invoice = await Invoice.findById(proc.invoice);
  if (!invoice) return fail(`The sale for ${proc.pn} is no longer in the system`, 404);

  return ok({ procedure: proc, invoice });
}, { perms: ['proc'] });
