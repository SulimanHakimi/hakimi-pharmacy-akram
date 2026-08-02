// Stamps `category` and `auto` onto cash-book entries written before the costs and
// loan screens existed, so the breakdowns and the read-only guard cover old data too.
// Safe to re-run: only entries with no category are touched.
//
//   npm run backfill
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env.local' });

const { default: connectDB } = await import('../lib/db.js');
const { Transaction } = await import('../lib/models/index.js');
const { STOCK_CATEGORY } = await import('../lib/labels.js');

// The descriptions these entries were written with are the only clue an old row
// carries about where it came from.
const RULES = [
  [/^Sale INV-/i, 'Sales', true],
  [/^Credit repayment —/i, 'Credit repayment', true],
  [/^PO-\d+ payment —/i, STOCK_CATEGORY, true],
  [/^Supplier payment —/i, STOCK_CATEGORY, true]
];

const classify = (desc) => RULES.find(([re]) => re.test(desc || '')) || [null, 'Other', false];

async function main() {
  await connectDB();

  const pending = await Transaction.find({ category: { $exists: false } });
  console.log(`${pending.length} entries to classify.`);

  const tally = {};
  for (const tx of pending) {
    const [, category, auto] = classify(tx.desc);
    await Transaction.updateOne({ _id: tx._id }, { $set: { category, auto } });
    tally[category] = (tally[category] || 0) + 1;
  }

  for (const [category, n] of Object.entries(tally)) console.log(`  ${category}: ${n}`);
  console.log('Done.');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
