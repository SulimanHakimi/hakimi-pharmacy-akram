import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env.local' });

const { default: connectDB } = await import('../lib/db.js');
const { Drug, Invoice, Return } = await import('../lib/models/index.js');

await connectDB();

const drugs = await Drug.find({ name: /Metronidazole/i });
console.log('=== Drugs matching Metronidazole ===');
for (const d of drugs) console.log(`  _id=${d._id} name="${d.name}" stock=${d.stock} supplier=${d.supplier}`);

const inv = await Invoice.findOne({ no: 'INV-13' });
console.log('\n=== INV-13 items ===');
if (inv) for (const it of inv.items) console.log(`  name="${it.name}" qty=${it.qty} price=${it.price}`);

const rets = await Return.find({ invoiceNo: 'INV-13' });
console.log('\n=== Returns on INV-13 ===');
for (const r of rets) {
  console.log(`  ${r.rn} amount=${r.amount} restocked=${r.restocked}`);
  for (const it of r.items) console.log(`    item name="${it.name}" qty=${it.qty} (typeof qty=${typeof it.qty})`);
}

await mongoose.disconnect();
