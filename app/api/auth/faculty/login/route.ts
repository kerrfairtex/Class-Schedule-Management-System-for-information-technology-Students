import { NextResponse } from 'next/server';
import { authenticateFaculty } from '@/lib/services';
import { setSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const faculty = authenticateFaculty(username, password);
    if (!faculty) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    await setSession({ role: 'faculty', id: faculty.username, name: faculty.name });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
