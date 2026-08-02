import mongoose from 'mongoose';

// Hot reload and warm serverless containers re-run this module, so every model is
// registered through mongoose.models first to avoid OverwriteModelError.
const model = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

const userSchema = new mongoose.Schema({
  key: { type: String, unique: true },               // 'admin' | 'seller'
  name: { type: String, required: true },
  role: { type: String, required: true },            // Administrator | Salesperson
  initials: String,
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  perms: {
    dash: { type: Boolean, default: false },
    pos: { type: Boolean, default: false },
    inv: { type: Boolean, default: false },
    sup: { type: Boolean, default: false },
    pur: { type: Boolean, default: false },
    sales: { type: Boolean, default: false },
    rx: { type: Boolean, default: false },
    cust: { type: Boolean, default: false },
    fin: { type: Boolean, default: false },
    ana: { type: Boolean, default: false },
    set: { type: Boolean, default: false }
  }
}, { timestamps: true });

const drugSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  supplier: { type: String, required: true },
  buy: { type: Number, required: true },
  sell: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  expiry: { type: String, required: true },          // 'YYYY-MM'
  batch: String,
  barcode: String
}, { timestamps: true });

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  person: String,
  phone: String,
  address: String,
  balance: { type: Number, default: 0 },             // outstanding payable
  lastOrder: String
}, { timestamps: true });

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  since: String,
  credit: { type: Number, default: 0 }               // outstanding قرض balance
}, { timestamps: true });

const invoiceSchema = new mongoose.Schema({
  no: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  customer: { type: String, required: true },
  phone: String,
  doctor: String,
  items: [{
    name: String,
    qty: Number,
    price: Number,                                   // sell price at time of sale
    buy: Number                                      // buy price at time of sale
  }],
  sub: Number,
  disc: { type: Number, default: 0 },
  vat: { type: Number, default: 0 },
  total: Number,
  // 'Partial' is the counter taking part of the money now and putting the rest on
  // قرض — paid + due always add up to total.
  payment: { type: String, enum: ['Cash', 'Credit', 'Partial'], default: 'Cash' },
  paid: { type: Number, default: 0 },                // taken at the counter
  due: { type: Number, default: 0 },                 // added to the customer's قرض
  servedBy: String
}, { timestamps: true });

/**
 * A customer bringing drugs back. This reverses the original sale rather than
 * booking a loss: sellable stock goes back on the shelf, the money value is
 * netted out of revenue and cost of goods sold, and whatever the customer is
 * owed is either taken off their قرض or handed back in cash.
 */
const returnSchema = new mongoose.Schema({
  rn: { type: String, required: true, unique: true },
  invoiceNo: { type: String, required: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  date: { type: Date, default: Date.now },
  customer: String,
  phone: String,
  items: [{
    name: String,
    qty: Number,
    price: Number,                                   // sell price on the original invoice
    buy: Number                                      // buy price on the original invoice
  }],
  // What the customer actually paid for these goods: the line value scaled by the
  // invoice's discount and VAT, so a return never hands back more than came in.
  amount: { type: Number, required: true },
  discShare: { type: Number, default: 0 },           // slice of the invoice discount undone
  creditCleared: { type: Number, default: 0 },       // taken off the customer's قرض
  refunded: { type: Number, default: 0 },            // cash handed back over the counter
  // Expired, damaged or opened medicine cannot go back on the shelf. The money is
  // still returned; only the stock movement is skipped.
  restocked: { type: Boolean, default: true },
  reason: String,
  servedBy: String
}, { timestamps: true });

const purchaseSchema = new mongoose.Schema({
  po: { type: String, required: true, unique: true },
  supplier: { type: String, required: true },
  date: { type: Date, default: Date.now },
  items: { type: Number, default: 1 },
  total: Number,
  status: { type: String, enum: ['Received', 'Pending'], default: 'Received' }
}, { timestamps: true });

const prescriptionSchema = new mongoose.Schema({
  rx: { type: String, required: true, unique: true },
  patient: { type: String, required: true },
  doctor: { type: String, required: true },
  date: { type: Date, default: Date.now },
  drugs: [String],
  status: { type: String, enum: ['Pending', 'Dispensed'], default: 'Pending' }
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  t: { type: Date, default: Date.now },
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  // Groups the cash book for the costs breakdown. Income uses 'Sales' or
  // 'Credit repayment'; expenses use one of ALL_EXPENSE_CATEGORIES.
  category: { type: String, default: 'Other' },
  desc: { type: String, required: true },
  amount: { type: Number, required: true },
  // Written by a sale, purchase or settlement rather than typed in by hand.
  // Those entries are read-only — deleting one would desync a stock, supplier
  // or customer balance that was moved at the same time.
  auto: { type: Boolean, default: false },
  recordedBy: String
}, { timestamps: true });

const activityLogSchema = new mongoose.Schema({
  t: { type: Date, default: Date.now },
  user: { type: String, default: 'System' },
  action: { type: String, required: true }
});

const counterSchema = new mongoose.Schema({
  key: { type: String, unique: true },               // 'invoice' | 'po' | 'rx' | 'return'
  seq: { type: Number, default: 0 }
});

const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'global' },
  currency: { type: String, default: 'AFN' },
  vatRate: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 20 },
  lastBackup: Date,
  // Printed on every invoice and report; edited under Settings.
  pharmacyName: { type: String, default: 'Hakimi Pharmacy' },
  pharmacyAddress: { type: String, default: 'Bazar Zahid Abad, Mohammad Agha, Logar' },
  pharmacyPhone: { type: String, default: '' },
  pharmacyLicense: { type: String, default: '' }
});

export const User = model('User', userSchema);
export const Drug = model('Drug', drugSchema);
export const Supplier = model('Supplier', supplierSchema);
export const Customer = model('Customer', customerSchema);
export const Invoice = model('Invoice', invoiceSchema);
export const Return = model('Return', returnSchema);
export const Purchase = model('Purchase', purchaseSchema);
export const Prescription = model('Prescription', prescriptionSchema);
export const Transaction = model('Transaction', transactionSchema);
export const ActivityLog = model('ActivityLog', activityLogSchema);
export const Counter = model('Counter', counterSchema);
export const Setting = model('Setting', settingSchema);

export async function nextSeq(key) {
  const doc = await Counter.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc.seq;
}

export async function getSettings() {
  let s = await Setting.findOne({ key: 'global' });
  if (!s) s = await Setting.create({ key: 'global' });
  return s;
}

export async function logAct(user, action) {
  try { await ActivityLog.create({ user: user || 'System', action }); } catch { /* non-fatal */ }
}
