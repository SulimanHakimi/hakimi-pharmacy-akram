// Reset a staff account's password directly in the database.
// For when nobody can sign in: the in-app form needs the current password,
// and /api/setup only resets by erasing every collection.
//
//   node scripts/set-password.mjs
//   node scripts/set-password.mjs someone@example.com "another password"
//
// Edit EMAIL / NEW_PASSWORD below, or pass them as arguments.
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Next.js loads .env.local for the app itself, but a standalone script must do it.
dotenv.config({ path: '.env.local' });

import bcrypt from 'bcryptjs';

const { default: connectDB } = await import('../lib/db.js');
const { User, logAct } = await import('../lib/models/index.js');

const EMAIL = 'afgsuliman50@gmail.com';
const NEW_PASSWORD = 'hakimi@@@';

async function main() {
  const targetEmail = (process.argv[2] || EMAIL).trim();
  const password = process.argv[3] || NEW_PASSWORD;

  // Same floor the app enforces in /api/auth/change-password.
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  await connectDB();

  const searchEmail = targetEmail.toLowerCase();
  let user = await User.findOne({ email: searchEmail });
  
  if (!user) {
    const escaped = targetEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    user = await User.findOne({ email: { $regex: new RegExp(`^\\s*${escaped}\\s*$`, 'i') } });
    if (!user) {
      user = await User.findOne({ email: { $regex: escaped, $options: 'i' } });
    }
  }

  if (!user) {
    const all = await User.find().select('email role').lean();
    console.error(`No account with email "${targetEmail}".`);
    console.error(all.length
      ? `Existing accounts:\n${all.map((u) => `  "${u.email}"  (${u.role})`).join('\n')}`
      : 'There are no accounts at all — run `npm run init` first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  user.email = user.email.trim().toLowerCase();
  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  await logAct('System', `Password reset for ${user.name} via set-password script`);

  console.log(`Password updated successfully for ${user.email} (${user.role}).`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
