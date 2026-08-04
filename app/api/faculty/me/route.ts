import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getFacultyByUsername, getFacultyTimetable } from '@/lib/services';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'faculty') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const faculty = getFacultyByUsername(session.id);
  if (!faculty) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const timetable = getFacultyTimetable(session.id);
  return NextResponse.json({ faculty, timetable });
}
