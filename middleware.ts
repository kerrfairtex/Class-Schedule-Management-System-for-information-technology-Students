import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC = ['/', '/login', '/about', '/about/evidence', '/schedules', '/programs', '/faculty', '/rooms', '/academic-calendar', '/contact'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.includes(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get('csms_session');
  const isAdminSubpage =
    pathname.startsWith('/admin/');
  const isFacultyDashboard =
    pathname.startsWith('/faculty/');
  const isStudentDashboard =
    pathname.startsWith('/student/');

  if ((isAdminSubpage || isFacultyDashboard || isStudentDashboard) && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on /admin/* and /faculty/* and /student/* subpages only.
  // PUBLIC list above exempts /admin, /faculty, /student root paths.
  matcher: ['/admin/:path*', '/faculty/:path*', '/student/:path*'],
};
