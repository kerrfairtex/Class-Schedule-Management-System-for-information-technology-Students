import { NextResponse } from 'next/server';
import { getSession } from '@/lib/modules/mod-01-auth/session';
import { authorize } from '@/lib/modules/mod-01-auth/service';

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ session: null });
  }

  const redirectMap = {
    admin: '/admin/dashboard',
    faculty: '/faculty/dashboard',
    student: '/student/dashboard',
  };

  return NextResponse.json({
    session: {
      id: session.id,
      username: session.username,
      role: session.role,
      name: session.name,
    },
    redirect: redirectMap[session.role as keyof typeof redirectMap] || '/',
  });
}
