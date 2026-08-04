import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getFacultyForSubject } from '@/lib/services';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');
  if (!subject) return NextResponse.json({ error: 'Subject required' }, { status: 400 });
  return NextResponse.json(getFacultyForSubject(subject));
}
