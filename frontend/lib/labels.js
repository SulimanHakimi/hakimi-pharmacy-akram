export const LABELS = {
  dash: 'Dashboard',
  pos: 'Point of Sale',
  inv: 'Inventory',
  sup: 'Suppliers',
  pur: 'Purchases',
  sales: 'Invoices',
  rx: 'Prescriptions',
  cust: 'Customers',
  loans: 'Loan Sales',
  fin: 'Finance',
  exp: 'Costs & Expenses',
  ana: 'Analytics & Reports',
  set: 'Settings'
};

// Running costs the pharmacy books by hand. Buying stock is deliberately not on this
// list — purchases and supplier payments book themselves under STOCK_CATEGORY so the
// two never get mixed up in the breakdown.
export const EXPENSE_CATEGORIES = [
  'Rent', 'Salaries', 'Utilities', 'Transport', 'Supplies',
  'Maintenance', 'Licences & fees', 'Marketing', 'Bank charges', 'Other'
];

export const STOCK_CATEGORY = 'Stock purchase';

// Money handed back on a return. It reverses a sale rather than costing the
// pharmacy anything, so it is kept out of the running-cost totals and out of the
// operating expenses on the profit and loss report.
export const REFUND_CATEGORY = 'Refund';

export const ALL_EXPENSE_CATEGORIES = [...EXPENSE_CATEGORIES, STOCK_CATEGORY];

// Name and address are stored in the database and edited under Settings; these are
// only the fallbacks used before the settings load.
export const DEFAULT_PHARMACY = {
  pharmacyName: 'Hakimi Pharmacy',
  pharmacyAddress: 'Bazar Zahid Abad, Mohammad Agha, Logar',
  pharmacyPhone: '',
  pharmacyLicense: ''
};
