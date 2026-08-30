import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/modules/mod-01-auth/session';

/**
 * Logout intentionally skips CSRF protection.
 *
 * HTML <form action="/api/auth/logout" method="POST"> submits cannot set
 * custom headers, so a CSRF check would break the existing form-based
 * logout flow. Logout is also a security-positive action (it CLEARS the
 * session); a malicious cross-site logout is at worst a nuisance and
 * provides no privilege escalation. The SameSite=Lax cookie attribute
 * already provides additional CSRF mitigation for cookie-based auth.
 */
export async function POST(request: Request) {
  await clearSession();
  // 303 See Other forces the browser to convert the redirect target to GET,
  // which is the correct status for form POST → redirect flows.
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
