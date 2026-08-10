import { NextResponse } from 'next/server';
import { getSession } from '@/lib/modules/mod-01-auth/session';
import { authorize } from '@/lib/modules/mod-01-auth/service';
import { getActiveSemester, getSections } from '@/lib/modules/mod-02-master-list/service';
import { getSchedulesBySection } from '@/lib/modules/mod-03-schedule-engine/service';
import { getDb } from '@/lib/persistence/db';

export async function GET(request: Request) {
  const session = await getSession();
  if (!authorize(session, ['student', 'admin'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sectionCode = searchParams.get('section');

  const semester = getActiveSemester();
  if (!semester) return NextResponse.json({ schedules: [], sections: [] });

  if (session?.role === 'admin' && !sectionCode) {
    return NextResponse.json({ sections: getSections(semester.id), semester });
  }

  if (session?.role === 'student' && session.studentId) {
    const db = getDb();
    const student = db
      .prepare('SELECT s.*, sec.code AS section_code FROM students s JOIN sections sec ON sec.id = s.section_id WHERE s.id = ?')
      .get(session.studentId) as { section_id: number; section_code: string };
    const schedules = getSchedulesBySection(student.section_id, semester.id);
    return NextResponse.json({ student, schedules, semester });
  }

  if (sectionCode) {
    const db = getDb();
    const section = db
      .prepare('SELECT * FROM sections WHERE code = ?')
      .get(sectionCode) as { id: number } | undefined;
    if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    const schedules = getSchedulesBySection(section.id, semester.id);
    return NextResponse.json({ schedules, semester, sectionCode });
  }

  return NextResponse.json({ sections: getSections(semester.id), semester });
}
