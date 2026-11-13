import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/modules/mod-01-auth/session';

export async function POST(request: Request) {
  await clearSession();

  // Behind Render's proxy, request.url points at the internal address
  // (localhost:10000). Build the redirect from the forwarded public host.
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const publicHost = host && !host.startsWith('localhost') ? host : null;
  const location = publicHost ? `${proto}://${publicHost}/login` : '/login';

  // 303 forces the browser to follow with GET.
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}
