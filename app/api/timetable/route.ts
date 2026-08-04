import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  verifyFacultyToken,
  addFacultySlot,
  finalizeFacultyTimetable,
  resetFacultyTimetable,
  enrollStudentInFaculty,
} from '@/lib/services';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  try {
    if (session.role === 'faculty') {
      switch (action) {
        case 'verify-token': {
          const valid = verifyFacultyToken(session.id, body.token);
          if (!valid) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
          return NextResponse.json({ success: true });
        }
        case 'add-slot': {
          addFacultySlot(session.id, body);
          return NextResponse.json({ success: true, message: 'Timetable updated' });
        }
        case 'finalize': {
          finalizeFacultyTimetable(session.id);
          return NextResponse.json({ success: true, message: 'Timetable finalized' });
        }
        case 'reset': {
          resetFacultyTimetable(session.id);
          return NextResponse.json({ success: true, message: 'Timetable reset' });
        }
        default:
          return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }

    if (session.role === 'student' && action === 'enroll') {
      enrollStudentInFaculty(parseInt(session.id, 10), body.facultyUsername, body.subject);
      return NextResponse.json({ success: true, message: 'Enrolled successfully' });
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
