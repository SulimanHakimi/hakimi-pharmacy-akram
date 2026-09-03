export const LABELS = {
  dash: 'Dashboard',
  pos: 'Point of Sale',
  inv: 'Inventory',
  sup: 'Suppliers',
  pur: 'Purchases',
  sales: 'Invoices',
  rx: 'Prescriptions',
  proc: 'Procedures',
  cust: 'Customers',
  loans: 'Loan Sales',
  fin: 'Finance',
  exp: 'Costs & Expenses',
  ana: 'Analytics & Reports',
  users: 'Users & Access',
  set: 'Settings'
};

/**
 * What the super admin can hand out, in the order the Users screen lists it.
 * `screen` entries open a page in the sidebar; `action` entries unlock something
 * inside a page the account can already see.
 *
 * Deleting is deliberately absent: removing a drug or a cost entry stays with the
 * super admin and cannot be granted.
 */
export const GRANTABLE = [
  { key: 'dash', kind: 'screen', label: 'Dashboard', hint: 'Takings, stock alerts and the day’s summary' },
  { key: 'pos', kind: 'screen', label: 'Point of Sale', hint: 'Sell at the counter and print invoices' },
  { key: 'inv', kind: 'screen', label: 'Inventory', hint: 'See the drug list, prices and stock' },
  { key: 'invEdit', kind: 'action', label: 'Add & edit drugs', hint: 'Change a drug’s prices, stock and details', needs: 'inv' },
  { key: 'sup', kind: 'screen', label: 'Suppliers', hint: 'Distributors and what is owed to them' },
  { key: 'pur', kind: 'screen', label: 'Purchases', hint: 'Purchase orders and receiving stock' },
  { key: 'sales', kind: 'screen', label: 'Invoices', hint: 'Past sales, reprints and returns' },
  { key: 'rx', kind: 'screen', label: 'Prescriptions', hint: 'Record and dispense prescriptions' },
  { key: 'proc', kind: 'screen', label: 'Procedures', hint: 'ختنه and تطبیق — the fee and the drugs used' },
  { key: 'cust', kind: 'screen', label: 'Customers', hint: 'Customer list, history and قرض balances' },
  { key: 'fin', kind: 'screen', label: 'Finance & Costs', hint: 'Cash book, costs, loans and expenses' },
  { key: 'ana', kind: 'screen', label: 'Analytics & Reports', hint: 'Sales reports and profit and loss' },
  { key: 'set', kind: 'screen', label: 'Settings', hint: 'Pricing, pharmacy details, backups and the activity log' }
];

export const ROLES = ['Administrator', 'Pharmacist', 'Salesperson', 'Stock keeper', 'Accountant'];

/**
 * The work the pharmacy does besides selling over the counter. Held in Dari
 * because that is what the staff call it and what prints on the invoice line.
 */
export const PROCEDURE_TYPES = ['ختنه', 'تطبیق'];

// English gloss for the screens, which stay in English like the rest of the app.
export const PROCEDURE_LABELS = { 'ختنه': 'Circumcision', 'تطبیق': 'Injection / dressing' };

/**
 * How the fee reads as a line on the invoice. The fee rides on the same sale as
 * the drugs, so the patient gets one bill and the reports get one figure; this is
 * the line that carries it.
 */
export const serviceLineName = (type) => `${type} — فیس خدمات`;

// Running costs the pharmacy books by hand. Buying stock is deliberately not on this
// list — purchases and supplier payments book themselves under STOCK_CATEGORY so the
// two never get mixed up in the breakdown.
export const EXPENSE_CATEGORIES = [
  'Rent', 'Salaries', 'Utilities', 'Transport', 'Supplies',
  'Maintenance', 'Licences & fees', 'Marketing', 'Bank charges', 'Other'
];

export const STOCK_CATEGORY = 'Stock purchase';

// Cash the owner puts into the till from their own pocket — an opening float or a
// top-up to cover a big stock order. It lands in the cash box, so it is booked as
// income, but it is not a sale: revenue and profit are read off invoices, never the
// cash book, so this money never counts towards either.
export const CAPITAL_CATEGORY = 'Capital';

// Income entries on the Finance cash book. 'Sales' and 'Credit repayment' are written
// automatically at the counter; 'Capital' and 'Other' are the ones typed in by hand.
export const INCOME_CATEGORIES = ['Sales', 'Credit repayment', CAPITAL_CATEGORY, 'Other'];

// Money handed back on a return. It reverses a sale rather than costing the
// pharmacy anything, so it is kept out of the running-cost totals and out of the
// operating expenses on the profit and loss report.
export const REFUND_CATEGORY = 'Refund';

export const ALL_EXPENSE_CATEGORIES = [...EXPENSE_CATEGORIES, STOCK_CATEGORY];

/**
 * The printed invoice, in Dari. It is the one thing that leaves the pharmacy in a
 * customer's hand, so it is the one thing not in English — every screen, report
 * and button the staff use stays as it was.
 */
export const INVOICE_DARI = {
  title: 'فاکتور فروش',
  license: 'جواز نمبر',
  no: 'شماره فاکتور',
  date: 'تاریخ',
  customer: 'مشتری',
  walkIn: 'مشتری عادی',
  doctor: 'نسخه داکتر',
  noDoctor: 'بدون نسخه',
  servedBy: 'فروشنده',
  payment: 'طرز پرداخت',
  item: 'قلم دوا',
  qty: 'تعداد',
  price: 'قیمت فی واحد',
  amount: 'مبلغ',
  sub: 'مجموع',
  disc: 'تخفیف',
  vat: 'مالیه',
  total: 'مجموع قابل پرداخت',
  paidNow: 'پرداخت شده',
  remaining: 'باقیمانده قرض',
  thanks: 'تشکر از خرید شما — شفای عاجل',
  noReturn: 'دوا بعد از فروش مسترد نمی‌گردد'
};

// The payment methods as they print on the invoice.
export const PAYMENT_DARI = {
  Cash: 'نقده',
  Credit: 'قرض',
  Partial: 'قسمی'
};

// Name and address are stored in the database and edited under Settings; these are
// only the fallbacks used before the settings load.
export const DEFAULT_PHARMACY = {
  pharmacyName: 'Hakimi Pharmacy',
  pharmacyAddress: 'Bazar Zahid Abad, Mohammad Agha, Logar',
  pharmacyPhone: '',
  pharmacyLicense: ''
};
