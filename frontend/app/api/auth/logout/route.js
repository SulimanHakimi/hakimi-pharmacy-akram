import { route, ok } from '@/lib/route';
import { logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

export const POST = route(async (request, { user }) => {
  await logAct(user.name, 'Signed out');
  return ok({ ok: true });
});
