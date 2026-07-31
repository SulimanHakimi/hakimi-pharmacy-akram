import { route, ok } from '@/lib/route';
import { periodData, breakdown } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export const GET = route(async (request, { params }) => {
  const period = ['daily', 'weekly', 'monthly', 'yearly'].includes(params.period) ? params.period : 'daily';
  const pd = await periodData(period);
  const b = await breakdown(pd.invoices);
  return ok({ cur: pd.cur, prev: pd.prev, bars: pd.bars, title: pd.title, range: pd.range, ...b });
}, { perms: ['ana'] });
