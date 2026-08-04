import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getStudentBySap,
  getSubjectsByYear,
  getStudentTimetable,
} from '@/lib/services';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sap = parseInt(session.id, 10);
  const student = getStudentBySap(sap);
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const subjects = getSubjectsByYear(student.year);
  const timetable = getStudentTimetable(sap);
  const enrolled = Array.from(new Set(timetable.map((t) => t.subject)));

  return NextResponse.json({ student, subjects, timetable, enrolled });
}
