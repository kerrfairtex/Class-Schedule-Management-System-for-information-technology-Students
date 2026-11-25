import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/modules/mod-01-auth/session';
import { authorize } from '@/lib/modules/mod-01-auth/service';
import { getActiveSemester } from '@/lib/modules/mod-02-master-list/service';
import { setFacultyAvailability } from '@/lib/modules/mod-02-master-list/availability';
import { getSchedulesByFaculty } from '@/lib/modules/mod-03-schedule-engine/service';
import { getDb } from '@/lib/persistence/db';

async function facultySession() {
  const session = await getSession();
  return authorize(session, ['faculty']) && session?.facultyId ? session : null;
}

export async function GET() {
  const session = await facultySession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const semester = await getActiveSemester();
  if (!semester) return NextResponse.json({ schedules: [], faculty: null });

  const db = await getDb();
  const faculty = await db.prepare('SELECT * FROM faculty WHERE id = ?').get(session.facultyId);
  const schedules = await getSchedulesByFaculty(session.facultyId!, semester.id, 'faculty');
  return NextResponse.json({ faculty, schedules, semester });
}

const AvailabilitySchema = z.object({
  action: z.literal('set-availability'),
  timeSlotId: z.number().int().positive(),
  isAvailable: z.boolean(),
});

/** Faculty update their OWN availability; the id always comes from the session. */
export async function POST(request: Request) {
  const session = await facultySession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = AvailabilitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Choose a period' }, { status: 400 });

  const db = await getDb();
  const slot = await db.prepare('SELECT id FROM time_slots WHERE id = ?').get(parsed.data.timeSlotId);
  if (!slot) return NextResponse.json({ error: 'That period no longer exists' }, { status: 404 });

  await setFacultyAvailability(session.facultyId!, parsed.data.timeSlotId, parsed.data.isAvailable, session.id);
  return NextResponse.json({ success: true });
}
