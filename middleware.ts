import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC = ['/', '/login', '/about', '/about/evidence', '/schedules', '/programs', '/faculty', '/rooms', '/academic-calendar', '/contact', '/change-password'];

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

  // Enforce must_change_password unless disabled via env var
  if (session && process.env.CSMS_DISABLE_MUST_CHANGE_PASSWORD !== '1') {
    try {
      const payload = session.value.split('|')[0];
      const sessionData = JSON.parse(payload);
      if (sessionData.mustChangePassword && pathname !== '/change-password') {
        return NextResponse.redirect(new URL('/change-password', request.url));
      }
    } catch {
      // Invalid session - let it through to be handled by the page
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on /admin/* and /faculty/* and /student/* subpages only.
  // PUBLIC list above exempts /admin, /faculty, /student root paths.
  matcher: ['/admin/:path*', '/faculty/:path*', '/student/:path*'],
};
