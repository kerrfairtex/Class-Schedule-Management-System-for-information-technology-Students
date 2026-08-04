import { NextResponse } from 'next/server';
import { getSession } from '@/lib/modules/mod-01-auth/session';
import { authorize } from '@/lib/modules/mod-01-auth/service';
import {
  getDashboardStats,
  getFaculty,
  getStudents,
  getSubjects,
  getSections,
  getRooms,
  getBuildings,
  getCurriculum,
  getActiveSemester,
  getTimeSlots,
  createFaculty,
  createStudent,
  createSubject,
  createSection,
  createRoom,
  createBuilding,
  addCurriculumEntry,
} from '@/lib/modules/mod-02-master-list/service';
import {
  getSchedulesBySemester,
  createSchedule,
  updateScheduleTimeSlot,
  deleteSchedule,
  generateSchedulesForSection,
} from '@/lib/modules/mod-03-schedule-engine/service';
import { createBackup } from '@/lib/modules/mod-08-database-service/backup';
import { getAuditLogs } from '@/lib/modules/mod-08-database-service/audit';
import { createUser } from '@/lib/modules/mod-01-auth/service';

export async function GET(request: Request) {
  const session = await getSession();
  if (!authorize(session, ['admin'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource');

  switch (resource) {
    case 'stats':
      return NextResponse.json(getDashboardStats());
    case 'faculty':
      return NextResponse.json(getFaculty());
    case 'students':
      return NextResponse.json(getStudents());
    case 'subjects':
      return NextResponse.json(getSubjects());
    case 'sections': {
      const semester = getActiveSemester();
      return NextResponse.json(semester ? getSections(semester.id) : []);
    }
    case 'rooms':
      return NextResponse.json(getRooms());
    case 'buildings':
      return NextResponse.json(getBuildings());
    case 'curriculum':
      return NextResponse.json(getCurriculum());
    case 'semester':
      return NextResponse.json(getActiveSemester());
    case 'schedules': {
      const semester = getActiveSemester();
      if (!semester) return NextResponse.json([]);
      return NextResponse.json(getSchedulesBySemester(semester.id));
    }
    case 'audit':
      return NextResponse.json(getAuditLogs());
    case 'time-slots':
      return NextResponse.json(getTimeSlots());
    default:
      return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!authorize(session, ['admin'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      case 'create-faculty': {
        const facultyId = createFaculty(body.data, body.subjectIds || [], session!.id);
        createUser({
          username: body.data.employee_id.toLowerCase(),
          password: body.password || 'faculty123',
          role: 'faculty',
          faculty_id: facultyId,
        });
        return NextResponse.json({ success: true, id: facultyId });
      }
      case 'create-student': {
        const studentId = createStudent(body.data, session!.id);
        createUser({
          username: body.data.student_id,
          password: body.password || 'student123',
          role: 'student',
          student_id: studentId,
        });
        return NextResponse.json({ success: true, id: studentId });
      }
      case 'create-subject':
        createSubject(body.code, body.name, body.credit_hours, body.program_id, session!.id);
        return NextResponse.json({ success: true });
      case 'create-section':
        createSection(body.code, body.program_id, body.year_level, body.semester_id, session!.id);
        return NextResponse.json({ success: true });
      case 'create-room':
        createRoom(body.building_id, body.code, body.name, body.capacity, session!.id);
        return NextResponse.json({ success: true });
      case 'create-building':
        createBuilding(body.code, body.name, session!.id);
        return NextResponse.json({ success: true });
      case 'add-curriculum':
        addCurriculumEntry(body.program_id, body.subject_id, body.year_level, body.semester_number, session!.id);
        return NextResponse.json({ success: true });
      case 'create-schedule':
        return NextResponse.json(createSchedule(body.data, session!.id));
      case 'move-schedule':
        return NextResponse.json(updateScheduleTimeSlot(body.scheduleId, body.timeSlotId, session!.id));
      case 'delete-schedule':
        deleteSchedule(body.scheduleId, session!.id);
        return NextResponse.json({ success: true });
      case 'generate-schedules': {
        const semester = getActiveSemester();
        if (!semester) return NextResponse.json({ error: 'No active semester' }, { status: 400 });
        const result = generateSchedulesForSection(body.sectionId, semester.id, session!.id);
        return NextResponse.json(result);
      }
      case 'backup':
        return NextResponse.json({ path: createBackup() });
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
