import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from './db';
import { User } from './models';

export const ok = (data, status = 200) => NextResponse.json(data, { status });
export const fail = (error, status = 400) => NextResponse.json({ error }, { status });

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, secret(), { expiresIn: '12h' });
}

export function publicUser(u) {
  return { id: u._id, key: u.key, name: u.name, role: u.role, initials: u.initials, email: u.email, perms: u.perms };
}

async function authenticate(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7), secret());
    return await User.findById(payload.sub).select('-passwordHash');
  } catch {
    return null;
  }
}

/**
 * Wraps a route handler with the database connection, authentication and the
 * permission check. `perms` grants access when the account holds ANY of them;
 * omit it for a route every signed-in account may reach. Pass `public: true`
 * for the sign-in route.
 */
export function route(handler, { perms, public: isPublic } = {}) {
  return async (request, ctx = {}) => {
    try {
      await connectDB();

      if (isPublic) return await handler(request, ctx);

      const user = await authenticate(request);
      if (!user) return fail('Authentication required', 401);
      if (perms && !perms.some((p) => user.perms?.[p])) {
        return fail('Your account role does not allow this action', 403);
      }

      const params = ctx.params ? await ctx.params : {};
      return await handler(request, { ...ctx, params, user });
    } catch (e) {
      console.error(e);
      if (e?.name === 'MongooseServerSelectionError') {
        return fail('Cannot reach the database. Check MONGODB_URI and the IP allowlist.', 503);
      }
      return fail(e?.message || 'Server error', e?.status || 500);
    }
  };
}

export async function body(request) {
  try { return await request.json(); } catch { return {}; }
}
