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
  getPrograms,
  getDepartments,
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
  getSchedulesBySection,
  createSchedule,
  updateScheduleTimeSlot,
  deleteSchedule,
  generateSchedulesForSection,
  transitionSchedule,
} from '@/lib/modules/mod-03-schedule-engine/service';
import { createBackup } from '@/lib/modules/mod-08-database-service/backup';
import { getAuditLogs } from '@/lib/modules/mod-08-database-service/audit';
import { createUser } from '@/lib/modules/mod-01-auth/service';
import {
  getFacultyList,
  getAvailabilityGrid,
  setFacultyAvailability,
} from '@/lib/modules/mod-02-master-list/availability';
import z from 'zod';

const AdminPostSchema = z.object({
  action: z.enum([
    'create-faculty',
    'create-student',
    'create-subject',
    'create-section',
    'create-room',
    'create-building',
    'add-curriculum',
    'create-schedule',
    'move-schedule',
    'delete-schedule',
    'generate-schedules',
    'backup',
    'set-availability',
    'transition-schedule',
  ]),
  data: z.unknown().optional(),
  password: z.string().optional(),
  subjectIds: z.array(z.number()).optional(),
  sectionId: z.number().optional(),
  scheduleId: z.number().optional(),
  timeSlotId: z.number().optional(),
  facultyId: z.number().optional(),
  isAvailable: z.boolean().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  credit_hours: z.number().optional(),
  program_id: z.number().optional(),
  year_level: z.number().optional(),
  semester_id: z.number().optional(),
  building_id: z.number().optional(),
  capacity: z.number().optional(),
  subject_id: z.number().optional(),
  semester_number: z.number().optional(),
});

function invalidBody(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

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
      const sectionId = searchParams.get('sectionId');
      if (sectionId) {
        return NextResponse.json(getSchedulesBySection(Number(sectionId), semester.id));
      }
      return NextResponse.json(getSchedulesBySemester(semester.id));
    }
    case 'audit':
      return NextResponse.json(getAuditLogs());
    case 'time-slots':
      return NextResponse.json(getTimeSlots());
    case 'schedule-options': {
      const semester = getActiveSemester();
      return NextResponse.json({
        sections: semester ? getSections(semester.id) : [],
        subjects: getSubjects(),
        faculty: getFaculty(),
        rooms: getRooms(),
        timeSlots: getTimeSlots(),
        semester,
      });
    }
    case 'meta':
      return NextResponse.json({
        programs: getPrograms(),
        departments: getDepartments(),
        sections: (() => {
          const semester = getActiveSemester();
          return semester ? getSections(semester.id) : [];
        })(),
        buildings: getBuildings(),
        subjects: getSubjects(),
        semester: getActiveSemester(),
      });
    case 'faculty-list':
      return NextResponse.json(getFacultyList());
    case 'availability': {
      const facultyId = Number(searchParams.get('facultyId'));
      if (!facultyId) return NextResponse.json({ error: 'facultyId required' }, { status: 400 });
      return NextResponse.json(getAvailabilityGrid(facultyId));
    }
    default:
      return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!authorize(session, ['admin'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Capture request context for audit (spec section 36)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null;
  const userAgent = request.headers.get('user-agent');
  const auditCtx = { ip, userAgent };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidBody('Invalid JSON body');
  }

  const parsed = AdminPostSchema.safeParse(body);
  if (!parsed.success) {
    return invalidBody('Invalid request');
  }

  const { action } = parsed.data;

  try {
    switch (action) {
      case 'create-faculty': {
        const facultySchema = z.object({
          data: z.object({
            employee_id: z.string().min(1),
            first_name: z.string().min(1),
            last_name: z.string().min(1),
            email: z.string().email(),
            phone: z.string().min(1),
            department_id: z.number(),
          }),
          subjectIds: z.array(z.number()),
          password: z.string().optional(),
        });
        const validated = facultySchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid faculty payload');
        const { data, subjectIds, password } = validated.data;
        const facultyId = createFaculty(data, subjectIds, session!.id);
        createUser({
          username: data.employee_id.toLowerCase(),
          password: password || 'faculty123',
          role: 'faculty',
          faculty_id: facultyId,
        });
        return NextResponse.json({ success: true, id: facultyId });
      }
      case 'create-student': {
        const studentSchema = z.object({
          data: z.object({
            student_id: z.string().min(1),
            first_name: z.string().min(1),
            last_name: z.string().min(1),
            email: z.string().email(),
            section_id: z.number(),
          }),
          password: z.string().optional(),
        });
        const validated = studentSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid student payload');
        const { data, password } = validated.data;
        const studentId = createStudent(data, session!.id);
        createUser({
          username: data.student_id,
          password: password || 'student123',
          role: 'student',
          student_id: studentId,
        });
        return NextResponse.json({ success: true, id: studentId });
      }
      case 'create-subject': {
        const subjectSchema = z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          credit_hours: z.number(),
          program_id: z.number(),
        });
        const validated = subjectSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid subject payload');
        const s = validated.data;
        createSubject(s.code, s.name, s.credit_hours, s.program_id, session!.id);
        return NextResponse.json({ success: true });
      }
      case 'create-section': {
        const sectionSchema = z.object({
          code: z.string().min(1),
          program_id: z.number(),
          year_level: z.number(),
          semester_id: z.number(),
        });
        const validated = sectionSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid section payload');
        const s = validated.data;
        createSection(s.code, s.program_id, s.year_level, s.semester_id, session!.id);
        return NextResponse.json({ success: true });
      }
      case 'create-room': {
        const roomSchema = z.object({
          building_id: z.number(),
          code: z.string().min(1),
          name: z.string().min(1),
          capacity: z.number(),
        });
        const validated = roomSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid room payload');
        const r = validated.data;
        createRoom(r.building_id, r.code, r.name, r.capacity, session!.id);
        return NextResponse.json({ success: true });
      }
      case 'create-building': {
        const buildingSchema = z.object({
          code: z.string().min(1),
          name: z.string().min(1),
        });
        const validated = buildingSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid building payload');
        const b = validated.data;
        createBuilding(b.code, b.name, session!.id);
        return NextResponse.json({ success: true });
      }
      case 'add-curriculum': {
        const curriculumSchema = z.object({
          program_id: z.number(),
          subject_id: z.number(),
          year_level: z.number(),
          semester_number: z.number(),
        });
        const validated = curriculumSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid curriculum payload');
        const c = validated.data;
        addCurriculumEntry(c.program_id, c.subject_id, c.year_level, c.semester_number, session!.id);
        return NextResponse.json({ success: true });
      }
      case 'create-schedule': {
        const scheduleSchema = z.object({
          data: z.object({
            section_id: z.number(),
            subject_id: z.number(),
            faculty_id: z.number(),
            room_id: z.number(),
            time_slot_id: z.number(),
            semester_id: z.number(),
          }),
        });
        const validated = scheduleSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid schedule payload');
        return NextResponse.json(createSchedule(validated.data.data, session!.id, auditCtx));
      }
      case 'move-schedule': {
        const moveSchema = z.object({
          scheduleId: z.number(),
          timeSlotId: z.number(),
        });
        const validated = moveSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid move payload');
        const m = validated.data;
        return NextResponse.json(updateScheduleTimeSlot(m.scheduleId, m.timeSlotId, session!.id, auditCtx));
      }
      case 'delete-schedule': {
        const deleteSchema = z.object({
          scheduleId: z.number(),
        });
        const validated = deleteSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid delete payload');
        const d = validated.data;
        deleteSchedule(d.scheduleId, session!.id, auditCtx);
        return NextResponse.json({ success: true });
      }
      case 'generate-schedules': {
        const generateSchema = z.object({
          sectionId: z.number(),
        });
        const validated = generateSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid generate payload');
        const semester = getActiveSemester();
        if (!semester) return NextResponse.json({ error: 'No active semester' }, { status: 400 });
        const g = validated.data;
        return NextResponse.json(generateSchedulesForSection(g.sectionId, semester.id, session!.id, auditCtx));
      }
      case 'backup':
        return NextResponse.json({ path: createBackup() });
      case 'set-availability': {
        const availabilitySchema = z.object({
          facultyId: z.number(),
          timeSlotId: z.number(),
          isAvailable: z.boolean(),
        });
        const validated = availabilitySchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid availability payload');
        const a = validated.data;
        setFacultyAvailability(a.facultyId, a.timeSlotId, a.isAvailable, session!.id, auditCtx);
        return NextResponse.json({ success: true });
      }
      case 'transition-schedule': {
        const transitionSchema = z.object({
          scheduleId: z.number(),
          toStatus: z.enum([
            'DRAFT',
            'PENDING_REVIEW',
            'APPROVED',
            'PUBLISHED',
            'CANCELLED',
            'ARCHIVED',
          ]),
        });
        const validated = transitionSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid transition payload');
        const t = validated.data;
        const result = transitionSchedule(
          t.scheduleId,
          t.toStatus,
          session!.id,
          session!.username,
          auditCtx
        );
        if (!result.ok) {
          return NextResponse.json(result, { status: 409 });
        }
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
