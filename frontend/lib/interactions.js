// Clinical reference data — advisory interaction pairs checked against whatever is
// in the cart or on a prescription. Extend this list as the pharmacy needs.
// Matching is on the leading word of the drug name, so "Ibuprofen 400mg Tab" and
// "Ibuprofen 200mg Syrup" both match the "ibuprofen" rule.
export const INTERACTIONS = [
  ['ibuprofen', 'diclofenac', 'Duplicate NSAIDs — higher risk of stomach bleeding'],
  ['ibuprofen', 'aspirin', 'Duplicate NSAIDs — higher risk of stomach bleeding'],
  ['ibuprofen', 'warfarin', 'Raised bleeding risk — monitor closely'],
  ['diclofenac', 'aspirin', 'Duplicate NSAIDs — higher risk of stomach bleeding'],
  ['azithromycin', 'amlodipine', 'QT prolongation risk — monitor heart rhythm'],
  ['ciprofloxacin', 'tizanidine', 'Avoid together — severe drop in blood pressure'],
  ['omeprazole', 'clopidogrel', 'Omeprazole reduces the effect of clopidogrel'],
  ['omeprazole', 'vitamin d3', 'Reduced absorption — advise separating doses'],
  ['metformin', 'prednisolone', 'Steroid raises blood sugar — monitor glucose'],
  ['warfarin', 'azithromycin', 'Raised INR — check clotting time'],
  ['amlodipine', 'simvastatin', 'Raised statin levels — keep simvastatin at a low dose']
];

const head = (name) => String(name).toLowerCase();

export function warningsFor(names) {
  const lower = names.map(head);
  const seen = new Set();
  const out = [];
  for (const [a, b, note] of INTERACTIONS) {
    const first = lower.find((n) => n.includes(a));
    const second = lower.find((n) => n.includes(b));
    if (!first || !second || first === second) continue;
    const key = a + '|' + b;
    if (seen.has(key)) continue;
    seen.add(key);
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    out.push(`${cap(a)} + ${cap(b)}: ${note}`);
  }
  return out;
}
