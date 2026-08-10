import { NextResponse } from 'next/server';
import { authenticate, toSessionUser } from '@/lib/modules/mod-01-auth/service';
import { setSession, getSession } from '@/lib/modules/mod-01-auth/session';
import z from 'zod';

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { username, password } = parsed.data;
    const user = authenticate(username, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const session = toSessionUser(user);
    await setSession(session);

    const redirectMap = {
      admin: '/admin/dashboard',
      faculty: '/faculty/dashboard',
      student: '/student/dashboard',
    };

    return NextResponse.json({
      success: true,
      role: user.role,
      redirect: redirectMap[user.role],
    });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
