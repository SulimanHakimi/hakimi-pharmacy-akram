import bcrypt from 'bcryptjs';
import { route, ok, fail, body, isSuperAdmin } from '@/lib/route';
import { User, logAct } from '@/lib/models';
import { cleanPerms, initials, listedUser, validateUser } from '@/lib/users';

export const dynamic = 'force-dynamic';

const isSelf = (target, user) => String(target._id) === String(user._id);

export const PUT = route(async (request, { params, user }) => {
  const target = await User.findById(params.id);
  if (!target) return fail('User not found', 404);

  const b = await body(request);
  const bad = validateUser(
    { name: b.name ?? target.name, email: b.email ?? target.email, password: b.password },
    { requirePassword: false }
  );
  if (bad) return fail(bad);

  if (b.email !== undefined) {
    const email = String(b.email).toLowerCase().trim();
    const clash = await User.findOne({ email, _id: { $ne: target._id } });
    if (clash) return fail('An account already uses that email address');
    target.email = email;
  }

  if (b.name !== undefined) {
    target.name = b.name.trim();
    target.initials = initials(target.name);
  }
  if (b.role !== undefined) target.role = String(b.role).trim();

  // Handing the role over is fine; giving it up is not, because an account that
  // demotes itself can no longer reach this screen to undo it.
  if (b.superAdmin !== undefined) {
    const wants = b.superAdmin === true;
    if (!wants && isSuperAdmin(target) && isSelf(target, user)) {
      return fail('You cannot remove your own super admin access');
    }
    target.superAdmin = wants;
  }

  if (b.perms !== undefined) target.perms = cleanPerms(b.perms);
  // A super admin reaches everything, so the boxes are cleared rather than left
  // half-ticked and misleading.
  if (target.superAdmin) target.perms = cleanPerms({});

  if (b.password) target.passwordHash = await bcrypt.hash(b.password, 10);

  await target.save();
  await logAct(user.name, `Updated user ${target.name}${b.password ? ' (password reset)' : ''}`);
  return ok(listedUser(target));
}, { superAdmin: true });

export const DELETE = route(async (request, { params, user }) => {
  const target = await User.findById(params.id);
  if (!target) return fail('User not found', 404);
  if (isSelf(target, user)) return fail('You cannot delete the account you are signed in with');

  // Never leave the pharmacy without an account that can hand out access again.
  if (isSuperAdmin(target)) {
    const owners = await User.countDocuments({ $or: [{ superAdmin: true }, { key: 'admin' }] });
    if (owners <= 1) return fail('This is the only super admin — promote someone else first');
  }

  await target.deleteOne();
  await logAct(user.name, `Deleted user ${target.name}`);
  return ok({ id: params.id });
}, { superAdmin: true });
