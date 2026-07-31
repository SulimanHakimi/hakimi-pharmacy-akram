// One-time setup: creates the two staff accounts and the settings row.
// Creates no drugs, suppliers, customers or sales — the pharmacy enters its own data.
// Safe to re-run: existing accounts are left untouched.
//
//   npm run init
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Next.js loads .env.local for the app itself, but a standalone script must do it.
dotenv.config({ path: '.env.local' });

import bcrypt from 'bcryptjs';

const { default: connectDB } = await import('../lib/db.js');
const { User, Counter, getSettings } = await import('../lib/models/index.js');

const ADMIN_NAME = process.env.ADMIN_NAME || 'Akram Hakimi';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'akram@hakimipharmacy.af').toLowerCase();
const SELLER_NAME = process.env.SELLER_NAME || 'Sales Counter';
const SELLER_EMAIL = (process.env.SELLER_EMAIL || 'seller@hakimipharmacy.af').toLowerCase();

const ALL = { dash: 1, pos: 1, inv: 1, sup: 1, pur: 1, sales: 1, rx: 1, cust: 1, fin: 1, ana: 1, set: 1 };
const SELLING_ONLY = { pos: 1, sales: 1 };

const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sellerPassword = process.env.SELLER_PASSWORD;

  if (!adminPassword || !sellerPassword) {
    console.error('Set ADMIN_PASSWORD and SELLER_PASSWORD in .env.local before running init.');
    process.exit(1);
  }
  if (adminPassword.length < 8 || sellerPassword.length < 8) {
    console.error('Both passwords must be at least 8 characters.');
    process.exit(1);
  }

  await connectDB();

  const accounts = [
    { key: 'admin', name: ADMIN_NAME, role: 'Administrator', email: ADMIN_EMAIL, password: adminPassword, perms: ALL },
    { key: 'seller', name: SELLER_NAME, role: 'Salesperson', email: SELLER_EMAIL, password: sellerPassword, perms: SELLING_ONLY }
  ];

  for (const a of accounts) {
    const existing = await User.findOne({ key: a.key });
    if (existing) {
      console.log(`${a.role} account already exists (${existing.email}) — left unchanged.`);
      continue;
    }
    await User.create({
      key: a.key, name: a.name, role: a.role, initials: initials(a.name),
      email: a.email, passwordHash: await bcrypt.hash(a.password, 10), perms: a.perms
    });
    console.log(`Created ${a.role}: ${a.email}`);
  }

  // Numbering starts at 1000 so the first invoice reads INV-1001.
  for (const key of ['invoice', 'po', 'rx']) {
    if (!(await Counter.findOne({ key }))) await Counter.create({ key, seq: 1000 });
  }

  await getSettings();
  console.log('Settings ready. Sign in, then add your suppliers and drugs to begin.');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
