import { NextResponse } from 'next/server';
import { authenticate, canSignIn, PORTAL_HOME, toSessionUser } from '@/lib/modules/mod-01-auth/service';
import { setSession } from '@/lib/modules/mod-01-auth/session';
import {
  checkLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
} from '@/lib/modules/mod-01-auth/rate-limit';
import z from 'zod';

const LoginSchema = z.object({
  username: z.string().min(1),
  // JSON has one number type, so a password like 224567777 arrives as a
  // number from some clients. Coerce it to a string instead of rejecting
  // it, so the password that was set can be used to log in.
  password: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => v.length > 0, 'Password is required'),
});

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  return 'unknown';
}

export async function POST(request: Request) {
  // Parse body first to get username for demo-account check
  let username: string;
  let password: string;
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.length > 0 ? issue.path.join('.') : 'request';
        if (!fields[key]) fields[key] = issue.message;
      }
      return NextResponse.json(
        { error: 'Invalid request', fields },
        { status: 400 }
      );
    }
    username = parsed.data.username.trim().toLowerCase();
    password = parsed.data.password;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const ip = getClientIP(request);

  const gate = checkLoginAllowed(username, ip);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: 'Too many failed login attempts. Please try again later.', retryAfter: gate.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSeconds) } }
    );
  }

  try {
    const user = await authenticate(username, password);
    if (!user) {
      recordLoginFailure(username, ip);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    recordLoginSuccess(username);

    // Students have no accounts: schedules and rooms are public. Old student
    // logins left in the database are refused here, not deleted.
    if (!canSignIn(user.role)) {
      return NextResponse.json(
        {
          error: 'Students do not need an account. Class schedules and room availability are public.',
          redirect: '/schedules',
        },
        { status: 403 }
      );
    }

    const session = await toSessionUser(user);
    await setSession(session);

    return NextResponse.json({ success: true, role: user.role, redirect: PORTAL_HOME[user.role] });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
