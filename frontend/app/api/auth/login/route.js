import bcrypt from 'bcryptjs';
import { route, ok, fail, body, signToken, publicUser } from '@/lib/route';
import { User, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
  const { email, password } = await body(request);
  if (!email || !password) return fail('Email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  // Identical message either way, so the form cannot be used to discover valid emails.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return fail('Incorrect email or password', 401);
  }

  await logAct(user.name, `Signed in — ${user.name} (${user.role})`);
  return ok({ token: signToken(user), user: publicUser(user) });
}, { public: true });
