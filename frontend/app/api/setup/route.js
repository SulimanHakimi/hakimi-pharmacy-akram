import bcrypt from 'bcryptjs';
import { route, ok, fail, body } from '@/lib/route';
import * as models from '@/lib/models';
import { User, Counter, getSettings, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

const ALL = { dash: 1, pos: 1, inv: 1, sup: 1, pur: 1, sales: 1, rx: 1, cust: 1, fin: 1, ana: 1, set: 1 };
const SELLING_ONLY = { pos: 1, sales: 1 };
const COLLECTIONS = ['User', 'Drug', 'Supplier', 'Customer', 'Invoice', 'Purchase', 'Prescription', 'Transaction', 'ActivityLog', 'Counter', 'Setting'];

const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

function guard(request) {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return fail('Setup is disabled', 403);
  if (request.headers.get('x-setup-token') !== expected) return fail('Invalid setup token', 403);
  return null;
}

/**
 * First-run bootstrap for hosts where the database is not reachable from a laptop
 * (serverless deploys behind an IP allowlist). Creates the same two accounts as
 * `npm run init`.
 *
 * Every call requires SETUP_TOKEN to be set in the environment and to match the
 * x-setup-token header. Delete SETUP_TOKEN once the accounts exist — without it
 * this route answers 403 to everything.
 */

// Non-destructive: report what is currently stored, so a reset is never blind.
export const GET = route(async (request) => {
  const blocked = guard(request);
  if (blocked) return blocked;

  const counts = {};
  for (const name of COLLECTIONS) counts[name] = await models[name].countDocuments();
  const users = await User.find().select('name role email');
  return ok({ counts, users });
}, { public: true });

export const POST = route(async (request) => {
  const blocked = guard(request);
  if (blocked) return blocked;

  const b = await body(request);
  const adminPassword = b.adminPassword || '';
  const sellerPassword = b.sellerPassword || '';
  if (adminPassword.length < 8 || sellerPassword.length < 8) {
    return fail('Both passwords must be at least 8 characters');
  }

  const existing = await User.countDocuments();
  // Without an explicit reset this route refuses to touch a database that is in use.
  if (existing > 0 && b.reset !== true) {
    return fail('Accounts already exist. Pass "reset": true to erase everything and start over.', 409);
  }

  const erased = {};
  if (b.reset === true) {
    for (const name of COLLECTIONS) {
      erased[name] = await models[name].countDocuments();
      await models[name].deleteMany({});
    }
  }

  const accounts = [
    {
      key: 'admin', role: 'Administrator', perms: ALL, password: adminPassword,
      name: b.adminName || process.env.ADMIN_NAME || 'Akram Hakimi',
      email: (b.adminEmail || process.env.ADMIN_EMAIL || 'akram@hakimipharmacy.af').toLowerCase()
    },
    {
      key: 'seller', role: 'Salesperson', perms: SELLING_ONLY, password: sellerPassword,
      name: b.sellerName || process.env.SELLER_NAME || 'Sales Counter',
      email: (b.sellerEmail || process.env.SELLER_EMAIL || 'seller@hakimipharmacy.af').toLowerCase()
    }
  ];

  const created = [];
  for (const a of accounts) {
    await User.create({
      key: a.key, name: a.name, role: a.role, initials: initials(a.name),
      email: a.email, passwordHash: await bcrypt.hash(a.password, 10), perms: a.perms
    });
    created.push({ name: a.name, role: a.role, email: a.email });
  }

  // Numbering starts at 1000 so the first invoice reads INV-1001.
  for (const key of ['invoice', 'po', 'rx']) {
    if (!(await Counter.findOne({ key }))) await Counter.create({ key, seq: 1000 });
  }

  await getSettings();
  await logAct('System', 'Initial setup completed — staff accounts created');
  return ok({ created, erased }, 201);
}, { public: true });
