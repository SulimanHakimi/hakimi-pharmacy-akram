import { isSuperAdmin } from './route';
import { GRANTABLE } from './labels';

const GRANTABLE_KEYS = GRANTABLE.map((g) => g.key);

export const initials = (name) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// Only the boxes the Users screen actually offers can be set, so a hand-written
// request cannot invent a permission or switch on one that was retired.
export function cleanPerms(input) {
  const perms = {};
  for (const k of GRANTABLE_KEYS) perms[k] = !!input?.[k];
  return perms;
}

export function validateUser({ name, email, password }, { requirePassword = true } = {}) {
  if (!name?.trim()) return 'Name is required';
  if (!/^\S+@\S+\.\S+$/.test(String(email || '').trim())) return 'A valid email address is required';
  if ((requirePassword || password) && String(password || '').length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}

// What the Users screen is allowed to see about an account. The hash never leaves
// the server, here or anywhere else.
export const listedUser = (u) => ({
  id: u._id, name: u.name, role: u.role, email: u.email, initials: u.initials,
  superAdmin: isSuperAdmin(u), key: u.key, perms: u.perms, createdAt: u.createdAt
});
