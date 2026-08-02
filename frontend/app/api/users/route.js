import bcrypt from 'bcryptjs';
import { route, ok, fail, body } from '@/lib/route';
import { User, logAct } from '@/lib/models';
import { cleanPerms, initials, listedUser, validateUser } from '@/lib/users';

export const dynamic = 'force-dynamic';

// Staff accounts and what each of them may reach. The whole screen belongs to the
// super admin — nobody else can list accounts, let alone create one.
export const GET = route(async () => {
  const users = await User.find().sort({ createdAt: 1 }).select('-passwordHash');
  return ok(users.map(listedUser));
}, { superAdmin: true });

export const POST = route(async (request, { user }) => {
  const b = await body(request);
  const bad = validateUser(b);
  if (bad) return fail(bad);

  const email = String(b.email).toLowerCase().trim();
  if (await User.findOne({ email })) return fail('An account already uses that email address');

  const created = await User.create({
    name: b.name.trim(),
    role: (b.role || 'Salesperson').trim(),
    initials: initials(b.name),
    email,
    passwordHash: await bcrypt.hash(b.password, 10),
    superAdmin: b.superAdmin === true,
    // A super admin reaches everything regardless, so the tick boxes are left off.
    perms: b.superAdmin === true ? cleanPerms({}) : cleanPerms(b.perms)
  });

  await logAct(user.name, `Added user ${created.name} (${created.role})`);
  return ok(listedUser(created), 201);
}, { superAdmin: true });
