import { route, ok } from '@/lib/route';
import { ActivityLog } from '@/lib/models';

export const dynamic = 'force-dynamic';

export const GET = route(async () => ok(await ActivityLog.find().sort({ t: -1 }).limit(60)), { perms: ['set'] });
