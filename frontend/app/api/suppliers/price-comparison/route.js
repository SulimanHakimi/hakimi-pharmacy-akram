import { route, ok } from '@/lib/route';
import { Drug } from '@/lib/models';

export const dynamic = 'force-dynamic';

// Buy prices for drugs stocked from more than one supplier, cheapest first.
export const GET = route(async () => {
  const drugs = await Drug.find();
  const byName = {};
  for (const d of drugs) (byName[d.name] ||= []).push({ supplier: d.supplier, buy: d.buy });

  const rows = Object.entries(byName)
    .filter(([, list]) => list.length > 1)
    .map(([name, list]) => ({ drug: name, prices: list.sort((a, b) => a.buy - b.buy) }));
  return ok(rows);
}, { perms: ['sup'] });
