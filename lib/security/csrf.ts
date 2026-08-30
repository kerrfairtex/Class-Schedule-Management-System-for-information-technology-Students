import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const CSRF_COOKIE = 'csms_csrf';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_SECRET = process.env.SESSION_SECRET ?? 'csms-dev-csrf-secret';
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Double-submit cookie CSRF (stateless, HMAC-signed token).
 *
 *  - On login, the server sets an `csms_csrf` cookie containing
 *    `nonce.timestamp.signature` AND returns the token in the JSON body
 *    so the client can echo it back in the `x-csrf-token` header.
 *  - Every state-changing request (POST/PUT/DELETE/PATCH) must include
 *    the header and it must match the cookie. The signature is verified
 *    via HMAC-SHA256 against SESSION_SECRET, so an attacker cannot
 *    forge the token even if they can set the cookie.
 *  - Same-origin browsers will always send the cookie; cross-origin
 *    attackers cannot read the cookie value to set the header.
 *  - GET requests are exempt (read-only).
 */

interface TokenParts {
  nonce: string;
  timestamp: number;
  signature: string;
}

function sign(payload: string): string {
  return createHmac('sha256', CSRF_SECRET).update(payload).digest('base64url');
}

function encodeToken(): string {
  const nonce = randomBytes(16).toString('base64url');
  const timestamp = Date.now();
  const payload = `${nonce}.${timestamp}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decodeToken(token: string): TokenParts | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [nonce, tsStr, signature] = parts;
  const timestamp = Number(tsStr);
  if (!Number.isFinite(timestamp)) return null;
  const expected = sign(`${nonce}.${timestamp}`);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;
  if (Date.now() - timestamp > TOKEN_TTL_MS) return null;
  return { nonce, timestamp, signature };
}

/**
 * Issue a new CSRF token + cookie. Called on login so the cookie is
 * scoped to the same origin as the session cookie.
 */
export async function issueCsrfToken(response: NextResponse): Promise<string> {
  const token = encodeToken();
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_MS / 1000,
  });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_MS / 1000,
  });
  return token;
}

/**
 * Validate a CSRF token from a request. Returns true iff the header
 * matches the cookie value AND the token signature is valid.
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!headerToken) return false;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;
  // constant-time header === cookie
  const h = Buffer.from(headerToken);
  const c = Buffer.from(cookieToken);
  if (h.length !== c.length) return false;
  if (!timingSafeEqual(h, c)) return false;
  // And the token must be validly signed + not expired
  return decodeToken(cookieToken) !== null;
}

/**
 * Helper for POST handlers. Returns either `null` (caller continues)
 * or a NextResponse with the appropriate 403 status.
 */
export async function requireCsrf(
  request: Request
): Promise<NextResponse | null> {
  if (await validateCsrfToken(request)) return null;
  return NextResponse.json(
    { error: 'CSRF token missing or invalid' },
    { status: 403 }
  );
}

export const CSRF = { COOKIE: CSRF_COOKIE, HEADER: CSRF_HEADER };