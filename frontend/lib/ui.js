// Colour tokens mirrored from globals.css, for the few places that need them in JS
// (inline SVG strokes, computed bar colours). Layout lives in globals.css.
export const C = {
  primary: '#106090', primaryDark: '#0B4A70', bg: '#F4F7F9', card: '#FFFFFF',
  border: '#E3E9EE', hairline: '#EFF3F6', text: '#1C2B36', muted: '#5E6E7E', faint: '#93A3B0',
  green: '#1E8E5A', amber: '#B77400', red: '#B3261E',
  blueSoft: '#EDF4F8', greenSoft: '#E6F3EC', amberSoft: '#FAF1DE', redSoft: '#FBEAE8'
};

export const avatar = (size) => ({ width: size, height: size, fontSize: size < 36 ? 13 : 15 });

/**
 * How much of a sale was taken at the counter and how much went on قرض.
 * Invoices written before part payments existed carry no split, so they are read
 * from the payment method: a credit sale was owed in full, anything else was paid
 * in full.
 */
export function invoiceSplit(inv) {
  const total = inv?.total || 0;
  if (inv?.due === undefined || inv?.due === null) {
    const onCredit = inv?.payment === 'Credit';
    return { paid: onCredit ? 0 : total, due: onCredit ? total : 0 };
  }
  return { paid: inv.paid || 0, due: inv.due || 0 };
}

// Stock status drives both the inventory pill and the POS colour cue.
export function stockStatus(drug, lowThreshold, monthsToExpiry) {
  if (drug.stock <= 0) return { label: 'Out of stock', cls: 'pill-red', color: C.red };
  if (monthsToExpiry <= 3) return { label: 'Expiring soon', cls: 'pill-red', color: C.red };
  if (drug.stock < lowThreshold) return { label: 'Low stock', cls: 'pill-amber', color: C.amber };
  return { label: 'In stock', cls: 'pill-green', color: C.green };
}
