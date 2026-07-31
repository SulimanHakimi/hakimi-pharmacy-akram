import bcrypt from 'bcryptjs';
import { route, ok, fail, body } from '@/lib/route';
import { User, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

export const POST = route(async (request, { user }) => {
  const { currentPassword, newPassword } = await body(request);
  if (!currentPassword || !newPassword) return fail('Current and new password are required');
  if (String(newPassword).length < 8) return fail('New password must be at least 8 characters');

  const full = await User.findById(user._id);
  if (!(await bcrypt.compare(currentPassword, full.passwordHash))) {
    return fail('Current password is incorrect', 401);
  }

  full.passwordHash = await bcrypt.hash(newPassword, 10);
  await full.save();
  await logAct(full.name, 'Changed their password');
  return ok({ ok: true });
});
