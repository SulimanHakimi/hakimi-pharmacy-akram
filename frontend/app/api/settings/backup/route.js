import { route, ok } from '@/lib/route';
import * as models from '@/lib/models';
import { getSettings, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

const COLLECTIONS = ['User', 'Drug', 'Supplier', 'Customer', 'Invoice', 'Purchase', 'Prescription', 'Transaction', 'ActivityLog', 'Counter', 'Setting'];

// Serverless filesystems are read-only and wiped between invocations, so the backup
// is returned to the browser as a download rather than written to disk.
export const POST = route(async (request, { user }) => {
  const dump = { exportedAt: new Date().toISOString(), exportedBy: user.name, data: {} };

  for (const name of COLLECTIONS) {
    const docs = await models[name].find().lean();
    // Password hashes stay out of the export.
    dump.data[name] = name === 'User'
      ? docs.map(({ passwordHash, ...rest }) => rest)
      : docs;
  }

  const s = await getSettings();
  s.lastBackup = new Date();
  await s.save();
  await logAct(user.name, 'Exported a database backup');

  return ok({ settings: s, dump });
}, { perms: ['set'] });
