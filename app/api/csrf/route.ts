import { NextResponse } from 'next/server';
import { getSession } from '@/lib/modules/mod-01-auth/session';
import { issueCsrfToken } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';

/**
 * GET /api/csrf
 *
 * Issues a fresh CSRF token for the current session. The token is
 * returned both as the response body (for the client to store) and
 * set as an HttpOnly cookie. The client must send the token back in
 * the x-csrf-token header on every state-changing request.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  const token = await issueCsrfToken(response);
  return NextResponse.json({ success: true, csrfToken: token });
}