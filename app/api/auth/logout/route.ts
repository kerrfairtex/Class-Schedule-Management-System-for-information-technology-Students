import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/modules/mod-01-auth/session';

export async function POST(request: Request) {
  await clearSession();
  // 303 See Other forces the browser to convert the redirect target to GET,
  // which is the correct status for form POST → redirect flows.
  //
  // Use a RELATIVE Location. NextResponse.redirect() requires an absolute URL,
  // and building one from request.url yields Render's internal address
  // (https://localhost:10000/...) behind the proxy, which the browser cannot
  // follow. A relative Location stays on the public host.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: '/login' },
  });
}
