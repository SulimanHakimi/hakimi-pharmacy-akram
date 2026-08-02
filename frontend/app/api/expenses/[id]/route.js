import { route, ok, fail } from '@/lib/route';
import { Transaction, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

// Only hand-typed costs can be removed. A purchase or supplier payment moved a
// stock or supplier balance when it was written, so deleting the cash-book half
// on its own would leave the books disagreeing.
// Entries written before `auto` existed carry no flag, so their description is
// the only thing that identifies them. Covers a database that has not been
// through `npm run backfill` yet.
const LEGACY_AUTO = /^(PO-\d+ payment —|Supplier payment —)/i;

export const DELETE = route(async (request, { params, user }) => {
  const tx = await Transaction.findById(params.id);
  if (!tx || tx.type !== 'Expense') return fail('Cost entry not found', 404);
  if (tx.auto || LEGACY_AUTO.test(tx.desc || '')) {
    return fail('This cost came from a purchase or supplier payment — reverse it there instead');
  }

  await tx.deleteOne();
  await logAct(user.name, `Deleted cost entry: ${tx.desc}`);
  return ok({ id: params.id });
}, { perms: ['fin'] });
