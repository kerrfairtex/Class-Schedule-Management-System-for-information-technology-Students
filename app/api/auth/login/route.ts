import { NextResponse } from 'next/server';
import { authenticate, toSessionUser } from '@/lib/modules/mod-01-auth/service';
import { setSession } from '@/lib/modules/mod-01-auth/session';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const user = authenticate(username, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const session = toSessionUser(user);
    await setSession(session);

    const redirectMap = {
      admin: '/admin/dashboard',
      faculty: '/faculty/schedule',
      student: '/student/schedule',
    };

    return NextResponse.json({ success: true, role: user.role, redirect: redirectMap[user.role] });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
