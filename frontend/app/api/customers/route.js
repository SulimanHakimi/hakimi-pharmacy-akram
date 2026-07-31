import { route, ok } from '@/lib/route';
import { Customer } from '@/lib/models';

export const dynamic = 'force-dynamic';

export const GET = route(async () => ok(await Customer.find().sort({ createdAt: 1 })), { perms: ['cust', 'fin'] });
