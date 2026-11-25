import { NextResponse } from 'next/server';
import { getSession } from '@/lib/modules/mod-01-auth/session';
import { PORTAL_HOME } from '@/lib/modules/mod-01-auth/service';

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      username: session.username,
      role: session.role,
      name: session.name,
    },
    redirect: PORTAL_HOME[session.role] ?? '/schedules',
  });
}
