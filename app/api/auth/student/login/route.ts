import { NextResponse } from 'next/server';
import { authenticateStudent } from '@/lib/services';
import { setSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { sap, password } = await request.json();
    const student = authenticateStudent(parseInt(sap, 10), password);
    if (!student) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    await setSession({
      role: 'student',
      id: String(student.sap),
      name: `${student.first_name} ${student.last_name}`,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
