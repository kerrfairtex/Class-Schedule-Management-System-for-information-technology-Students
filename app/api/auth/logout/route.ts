import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/modules/mod-01-auth/session';

export async function POST() {
  await clearSession();
  // 303 forces the browser to follow with GET. Use a RELATIVE Location:
  // building an absolute URL from request.url yields Render's internal
  // address (localhost:10000) behind the proxy.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: '/login' },
  });
}
