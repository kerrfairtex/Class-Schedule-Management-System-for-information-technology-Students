import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC = ['/', '/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.includes(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get('csms_session');
  const isProtected =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/faculty') ||
    pathname.startsWith('/student');

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/faculty/:path*', '/student/:path*'],
};
