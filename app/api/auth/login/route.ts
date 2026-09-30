import { NextResponse } from 'next/server';
import { authenticate, toSessionUser } from '@/lib/modules/mod-01-auth/service';
import { setSession, getSession } from '@/lib/modules/mod-01-auth/session';
import z from 'zod';

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Explicit demo account allowlist — only these usernames bypass the normal IP rate limiter.
// Do NOT add roles or other criteria here. This is an exact username allowlist.
const DEMO_USERNAMES = new Set<string>([
  'admin',
  'fac-001',
  'fac-002',
  'fac-003',
  '2022-0001',
  '2023-0001',
]);

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
  // Parse body first to get username for demo-account check
  let username: string;
  let password: string;
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    username = parsed.data.username.trim().toLowerCase();
    password = parsed.data.password;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Demo accounts bypass the normal IP-based rate limiter entirely.
  // The rate limiter is still applied to all other usernames.
  const isDemoAccount = DEMO_USERNAMES.has(username);

  const ip = getClientIP(request);

  // For non-demo accounts, check and apply rate limit
  if (!isDemoAccount) {
    const rateLimit = checkRateLimit(ip);

    // Set rate limit headers
    const headers = {
      'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimit.resetAt / 1000).toString(),
    };

    // Apply rate limit ONLY for non-demo accounts
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { status: 429, headers }
      );
    }
  }

  // For demo accounts, set headers with unlimited values
  const headers = {
    'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
    'X-RateLimit-Remaining': isDemoAccount ? '999' : RATE_LIMIT_MAX.toString(),
    'X-RateLimit-Reset': Math.ceil((Date.now() + RATE_LIMIT_WINDOW) / 1000).toString(),
  };

  try {
    const user = await authenticate(username, password);
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

    return NextResponse.json(
      {
        success: true,
        role: user.role,
        redirect: redirectMap[user.role],
      },
      { headers }
    );
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500, headers });
  }
}
