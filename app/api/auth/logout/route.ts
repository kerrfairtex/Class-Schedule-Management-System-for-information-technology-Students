import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/modules/mod-01-auth/session';

export async function POST(request: Request) {
  await clearSession();
  // 303 See Other forces the browser to convert the redirect target to GET,
  // which is the correct status for form POST → redirect flows.
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
