import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/services';
import { setSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const admin = authenticateAdmin(username, password);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    await setSession({ role: 'admin', id: admin.username, name: admin.username });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
