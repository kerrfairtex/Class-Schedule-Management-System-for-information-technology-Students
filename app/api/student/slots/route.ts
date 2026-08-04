import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getFacultySubjectSlots } from '@/lib/services';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const faculty = searchParams.get('faculty');
  const subject = searchParams.get('subject');
  if (!faculty || !subject) {
    return NextResponse.json({ error: 'Faculty and subject required' }, { status: 400 });
  }
  return NextResponse.json(getFacultySubjectSlots(faculty, subject));
}
