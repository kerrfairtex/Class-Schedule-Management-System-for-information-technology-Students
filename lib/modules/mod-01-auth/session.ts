import { cookies } from 'next/headers';
import type { SessionUser } from '@/lib/domain/types';
import * as crypto from 'crypto';

const SESSION_COOKIE = 'csms_session';
const SESSION_SECRET = process.env.SESSION_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const ALLOW_UNSIGNED = process.env.CSMS_ALLOW_UNSIGNED === '1';

function failClosed(message: string): never {
  throw new Error(message);
}

function sign(payload: string): string {
  if (!SESSION_SECRET) {
    if (isProduction) {
      failClosed('SESSION_SECRET is required in production');
    }
    if (!ALLOW_UNSIGNED) {
      failClosed('SESSION_SECRET is not set');
    }
    return payload;
  }
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  const signature = hmac.update(payload).digest('base64url');
  return `${payload}|${signature}`;
}

function unsign(raw: string): string | null {
  if (!raw.includes('|')) {
    if (!SESSION_SECRET && ALLOW_UNSIGNED) return raw;
    if (isProduction) return null;
    if (!SESSION_SECRET && !ALLOW_UNSIGNED) return null;
    return raw;
  }
  const [payload, signature] = raw.split('|');
  if (!SESSION_SECRET) {
    if (isProduction) return null;
    if (ALLOW_UNSIGNED) return payload;
    return null;
  }
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  const expected = hmac.update(payload).digest('base64url');
  if (signature !== expected) return null;
  return payload;
}

export async function setSession(user: SessionUser) {
  const payload = JSON.stringify(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sign(payload), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const payload = unsign(raw);
  if (!payload) return null;
  try {
    return JSON.parse(payload) as SessionUser;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function requireSession(session: SessionUser | null): SessionUser {
  if (!session) throw new Error('Unauthorized');
  return session;
}
