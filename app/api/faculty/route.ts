import { NextResponse } from 'next/server';
import { getSession } from '@/lib/modules/mod-01-auth/session';
import { authorize } from '@/lib/modules/mod-01-auth/service';
import { getActiveSemester } from '@/lib/modules/mod-02-master-list/service';
import { getSchedulesByFaculty } from '@/lib/modules/mod-03-schedule-engine/service';
import { getDb } from '@/lib/persistence/db';

export async function GET() {
  const session = await getSession();
  if (!authorize(session, ['faculty']) || !session?.facultyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const semester = getActiveSemester();
  if (!semester) return NextResponse.json({ schedules: [], faculty: null });

  const db = getDb();
  const faculty = db
    .prepare('SELECT * FROM faculty WHERE id = ?')
    .get(session.facultyId);

  const schedules = getSchedulesByFaculty(session.facultyId, semester.id);
  return NextResponse.json({ faculty, schedules, semester });
}
