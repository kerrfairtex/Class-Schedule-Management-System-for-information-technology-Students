import { NextResponse } from 'next/server';
import { authenticate, toSessionUser } from '@/lib/modules/mod-01-auth/service';
import { setSession, getSession } from '@/lib/modules/mod-01-auth/session';
import { issueCsrfToken } from '@/lib/security/csrf';
import z from 'zod';

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // 5 attempts per window

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    // First request or window expired
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetAt: entry.resetAt };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}, 60 * 1000); // Every minute

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(ip);

  // Set rate limit headers
  const headers = {
    'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimit.resetAt / 1000).toString(),
  };

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too many login attempts. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      },
      { status: 429, headers }
    );
  }

  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers });
    }

    const { username, password } = parsed.data;
    const user = authenticate(username, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401, headers });
    }

    const session = toSessionUser(user);
    await setSession(session);

    const redirectMap = {
      admin: '/admin/dashboard',
      faculty: '/faculty/dashboard',
      student: '/student/dashboard',
    };

    const response = NextResponse.json(
      {
        success: true,
        role: user.role,
        redirect: redirectMap[user.role],
      },
      { headers }
    );

    // Issue a CSRF token alongside the session cookie. The client must
    // echo this token in x-csrf-token on every state-changing request.
    const csrfToken = await issueCsrfToken(response);

    return NextResponse.json(
      {
        success: true,
        role: user.role,
        redirect: redirectMap[user.role],
        csrfToken,
      },
      { headers }
    );
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500, headers });
  }
}