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
  updateFaculty,
  deleteFaculty,
  createStudent,
  updateStudent,
  deleteStudent,
  createSubject,
  updateSubject,
  deleteSubject,
  createSection,
  updateSection,
  deleteSection,
  createRoom,
  updateRoom,
  deleteRoom,
  createBuilding,
  addCurriculumEntry,
  getUsers,
  updateUser,
  deleteUser,
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
import { getAuditLogs, logAudit } from '@/lib/modules/mod-08-database-service/audit';
import { createUser } from '@/lib/modules/mod-01-auth/service';
import { getDb } from '@/lib/persistence/db';
import { changePassword } from '@/lib/modules/mod-01-auth/session';
import { generateRandomPassword } from '@/lib/modules/mod-01-auth/service';
import {
  getFacultyList,
  getAvailabilityGrid,
  setFacultyAvailability,
} from '@/lib/modules/mod-02-master-list/availability';
import {
  toInt,
  toOptionalInt,
  toText,
  toOptionalText,
  toEmail,
  toOptionalEmail,
  toIdentifier,
  toIntArray,
  formatFieldErrors,
  friendlyDbError,
  type FieldErrors,
} from '@/lib/modules/mod-02-master-list/validation';
import z from 'zod';

const AdminPostSchema = z.object({
  action: z.enum([
    'create-faculty',
    'update-faculty',
    'delete-faculty',
    'create-student',
    'update-student',
    'delete-student',
    'create-subject',
    'update-subject',
    'delete-subject',
    'create-section',
    'update-section',
    'delete-section',
    'create-room',
    'update-room',
    'delete-room',
    'create-building',
    'create-user',
    'update-user',
    'delete-user',
    'add-curriculum',
    'create-schedule',
    'move-schedule',
    'delete-schedule',
    'generate-schedules',
    'backup',
    'set-availability',
    'transition-schedule',
    'reset-password',
  ]),
  data: z.unknown().optional(),
  password: z.string().optional(),
  subjectIds: z.array(z.number()).optional(),
  id: z.number().optional(),
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
  username: z.string().optional(),
  role: z.string().optional(),
  is_active: z.number().optional(),
  must_change_password: z.number().optional(),
  student_id: z.number().optional(),
});

function invalidBody(message: string, fields?: FieldErrors) {
  return NextResponse.json({ error: message, fields: fields ?? {} }, { status: 400 });
}

/** Build a 400 from accumulated field errors. */
function fieldErrorResponse(errors: FieldErrors) {
  return invalidBody(formatFieldErrors(errors), errors);
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
      return NextResponse.json(await getDashboardStats());
    case 'faculty':
      return NextResponse.json(await getFaculty());
    case 'students':
      return NextResponse.json(await getStudents());
    case 'subjects':
      return NextResponse.json(await getSubjects());
    case 'sections': {
      const semester = await getActiveSemester();
      return NextResponse.json(semester ? await getSections(semester.id) : []);
    }
    case 'rooms':
      return NextResponse.json(await getRooms());
    case 'buildings':
      return NextResponse.json(await getBuildings());
    case 'curriculum':
      return NextResponse.json(await getCurriculum());
    case 'semester':
      return NextResponse.json(await getActiveSemester());
    case 'schedules': {
      const semester = await getActiveSemester();
      if (!semester) return NextResponse.json([]);
      const sectionId = searchParams.get('sectionId');
      if (sectionId) {
        return NextResponse.json(await getSchedulesBySection(Number(sectionId), semester.id));
      }
      return NextResponse.json(await getSchedulesBySemester(semester.id));
    }
    case 'audit':
      return NextResponse.json(await getAuditLogs());
    case 'time-slots':
      return NextResponse.json(await getTimeSlots());
    case 'schedule-options': {
      const semester = await getActiveSemester();
      return NextResponse.json({
        sections: semester ? await getSections(semester.id) : [],
        subjects: await getSubjects(),
        faculty: await getFaculty(),
        rooms: await getRooms(),
        timeSlots: await getTimeSlots(),
        semester,
      });
    }
    case 'meta': {
      const semester = await getActiveSemester();
      return NextResponse.json({
        programs: await getPrograms(),
        departments: await getDepartments(),
        sections: semester ? await getSections(semester.id) : [],
        buildings: await getBuildings(),
        subjects: await getSubjects(),
        semester,
      });
    }
    case 'faculty-list':
      return NextResponse.json(await getFacultyList());
    case 'availability': {
      const facultyId = Number(searchParams.get('facultyId'));
      if (!facultyId) return NextResponse.json({ error: 'facultyId required' }, { status: 400 });
      return NextResponse.json(await getAvailabilityGrid(facultyId));
    }
    case 'users':
      return NextResponse.json(await getUsers());
    default:
      return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  }
}

/**
 * Shared coercion for the Master List payloads.
 *
 * Every numeric field is parsed exactly once through toInt/toOptionalInt so a
 * missing or malformed value becomes a 400 with a field-level message instead
 * of NaN reaching an int4 column.
 */
function coerceMasterListPayload(
  body: Record<string, any>,
  kind: 'faculty' | 'student' | 'subject' | 'section' | 'room' | 'user'
): { errors: FieldErrors; data: any } {
  const errors: FieldErrors = {};
  const data: Record<string, unknown> = {};

  switch (kind) {
    case 'faculty': {
      const raw = body.data ?? {};
      data.employee_id = toIdentifier(raw.employee_id, 'employee_id', errors);
      data.first_name = toText(raw.first_name, 'first_name', errors, { max: 120 });
      data.last_name = toText(raw.last_name, 'last_name', errors, { max: 120 });
      data.email = toOptionalEmail(raw.email, 'email', errors);
      data.phone = toOptionalText(raw.phone, 'phone', errors, { max: 40 });
      data.department_id = toInt(raw.department_id, 'department_id', errors, { min: 1 });
      return { errors, data };
    }
    case 'student': {
      const raw = body.data ?? {};
      // student_id is TEXT in the schema: '2022-0001' and '20250001' both work.
      data.student_id = toIdentifier(raw.student_id, 'student_id', errors);
      data.first_name = toText(raw.first_name, 'first_name', errors, { max: 120 });
      data.last_name = toText(raw.last_name, 'last_name', errors, { max: 120 });
      data.email = toOptionalEmail(raw.email, 'email', errors);
      data.section_id = toInt(raw.section_id, 'section_id', errors, { min: 1 });
      return { errors, data };
    }
    case 'subject': {
      // Subjects, Sections and Rooms historically took a FLAT payload
      // (code/name/... at the top level). Accept both the flat shape and the
      // nested `data` shape so existing clients keep working.
      const raw = body.data ?? body;
      data.code = toText(raw.code, 'code', errors, { max: 32 });
      data.name = toText(raw.name, 'name', errors, { max: 160 });
      data.credit_hours = toInt(raw.credit_hours, 'credit_hours', errors, { min: 0, max: 12 });
      data.program_id = toInt(raw.program_id, 'program_id', errors, { min: 1 });
      return { errors, data };
    }
    case 'section': {
      const raw = body.data ?? body;
      data.code = toText(raw.code, 'code', errors, { max: 32 });
      data.program_id = toInt(raw.program_id, 'program_id', errors, { min: 1 });
      data.year_level = toInt(raw.year_level, 'year_level', errors, { min: 1, max: 8 });
      data.semester_id = toInt(raw.semester_id, 'semester_id', errors, { min: 1 });
      return { errors, data };
    }
    case 'room': {
      const raw = body.data ?? body;
      data.building_id = toInt(raw.building_id, 'building_id', errors, { min: 1 });
      data.code = toText(raw.code, 'code', errors, { max: 32 });
      data.name = toText(raw.name, 'name', errors, { max: 160 });
      data.capacity = toInt(raw.capacity, 'capacity', errors, { min: 1, max: 2000 });
      return { errors, data };
    }
    case 'user': {
      const raw = body.data ?? {};
      data.username = toText(raw.username, 'username', errors, { max: 120 });
      const role = toText(raw.role, 'role', errors, { max: 20 });
      if (role !== undefined && !['admin', 'faculty', 'student'].includes(role)) {
        errors.role = 'Role must be admin, faculty or student';
      }
      data.role = role;
      data.is_active = toInt(raw.is_active ?? 1, 'is_active', errors, { min: 0, max: 1 });
      data.must_change_password = toInt(
        raw.must_change_password ?? 0,
        'must_change_password',
        errors,
        { min: 0, max: 1 }
      );
      data.faculty_id = toOptionalInt(raw.faculty_id, 'faculty_id', errors, { min: 1 });
      data.student_id = toOptionalInt(raw.student_id, 'student_id', errors, { min: 1 });
      return { errors, data };
    }
    default:
      return { errors, data };
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!authorize(session, ['admin'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  const bodyRecord = body as Record<string, any>;

  try {
    switch (action) {
      case 'create-faculty': {
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'faculty');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        const subjectIds = toIntArray(bodyRecord.subjectIds, 'subjectIds', errors);
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        const password = bodyRecord.password || 'faculty123';
        const facultyId = await createFaculty(data as any, subjectIds, session!.id);
        await createUser({
          username: String(data.employee_id).toLowerCase(),
          password,
          role: 'faculty',
          faculty_id: facultyId,
          must_change_password: bodyRecord.password ? 0 : 1,
        });
        return NextResponse.json({ success: true, id: facultyId });
      }
      case 'update-faculty': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'faculty');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        const subjectIds = toIntArray(bodyRecord.subjectIds, 'subjectIds', errors);
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        await updateFaculty(id, data as any, subjectIds, session!.id);
        return NextResponse.json({ success: true, id });
      }
      case 'delete-faculty': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        const removed = await deleteFaculty(id, session!.id);
        if (!removed) {
          return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, id });
      }
      case 'create-student': {
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'student');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        const password = bodyRecord.password || 'student123';
        const studentId = await createStudent(data as any, session!.id);
        // The login account is created with the same bcrypt hash the seed uses
        // (hashPassword, 10 rounds) so the new student can actually log in.
        await createUser({
          username: String(data.student_id),
          password,
          role: 'student',
          student_id: studentId ?? undefined,
          must_change_password: bodyRecord.password ? 0 : 1,
        });
        return NextResponse.json({ success: true, id: studentId });
      }
      case 'update-student': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'student');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        await updateStudent(id, data as any, session!.id);
        return NextResponse.json({ success: true, id });
      }
      case 'delete-student': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        const removed = await deleteStudent(id, session!.id);
        if (!removed) {
          return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, id });
      }
      case 'create-subject': {
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'subject');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        const id = await createSubject(data.code, data.name, data.credit_hours, data.program_id, session!.id);
        return NextResponse.json({ success: true, id });
      }
      case 'update-subject': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'subject');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        await updateSubject(id, data.code, data.name, data.credit_hours, data.program_id, session!.id);
        return NextResponse.json({ success: true, id });
      }
      case 'delete-subject': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        const removed = await deleteSubject(id, session!.id);
        if (!removed) {
          return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, id });
      }
      case 'create-section': {
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'section');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        const id = await createSection(data.code, data.program_id, data.year_level, data.semester_id, session!.id);
        return NextResponse.json({ success: true, id });
      }
      case 'update-section': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'section');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        await updateSection(id, data.code, data.program_id, data.year_level, data.semester_id, session!.id);
        return NextResponse.json({ success: true, id });
      }
      case 'delete-section': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        const removed = await deleteSection(id, session!.id);
        if (!removed) {
          return NextResponse.json({ error: 'Section not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, id });
      }
      case 'create-room': {
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'room');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        const id = await createRoom(data.building_id, data.code, data.name, data.capacity, session!.id);
        return NextResponse.json({ success: true, id });
      }
      case 'update-room': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'room');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        await updateRoom(id, data.building_id, data.code, data.name, data.capacity, session!.id);
        return NextResponse.json({ success: true, id });
      }
      case 'delete-room': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        const removed = await deleteRoom(id, session!.id);
        if (!removed) {
          return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, id });
      }
      case 'create-user': {
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'user');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        const password = bodyRecord.password || 'student123';
        if (String(password).length < 8) {
          return fieldErrorResponse({ password: 'Password must be at least 8 characters' });
        }
        await createUser({
          username: data.username,
          password: String(password),
          role: data.role as any,
          faculty_id: data.faculty_id ?? undefined,
          student_id: data.student_id ?? undefined,
          must_change_password: data.must_change_password,
        });
        return NextResponse.json({ success: true });
      }
      case 'update-user': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        const { errors, data } = coerceMasterListPayload(bodyRecord, 'user');
        if (Object.keys(errors).length > 0) return fieldErrorResponse(errors);
        await updateUser(id, data, session!.id);
        return NextResponse.json({ success: true, id });
      }
      case 'delete-user': {
        const id = toInt(bodyRecord.id, 'id', {}, { min: 1 });
        if (id === undefined) return invalidBody('id is required');
        if (id === session!.id) {
          return invalidBody('You cannot delete the account you are signed in with');
        }
        const removed = await deleteUser(id, session!.id);
        if (!removed) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, id });
      }
      case 'create-building': {
        const buildingSchema = z.object({
          code: z.string().min(1),
          name: z.string().min(1),
        });
        const validated = buildingSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid building payload');
        const b = validated.data;
        await createBuilding(b.code, b.name, session!.id);
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
        await addCurriculumEntry(c.program_id, c.subject_id, c.year_level, c.semester_number, session!.id);
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
        return NextResponse.json(await createSchedule(validated.data.data, session!.id));
      }
      case 'move-schedule': {
        const moveSchema = z.object({
          scheduleId: z.number(),
          timeSlotId: z.number(),
        });
        const validated = moveSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid move payload');
        const m = validated.data;
        return NextResponse.json(await updateScheduleTimeSlot(m.scheduleId, m.timeSlotId, session!.id));
      }
      case 'delete-schedule': {
        const deleteSchema = z.object({
          scheduleId: z.number(),
        });
        const validated = deleteSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid delete payload');
        const d = validated.data;
        await deleteSchedule(d.scheduleId, session!.id);
        return NextResponse.json({ success: true });
      }
      case 'generate-schedules': {
        const generateSchema = z.object({
          sectionId: z.number(),
        });
        const validated = generateSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid generate payload');
        const semester = await getActiveSemester();
        if (!semester) return NextResponse.json({ error: 'No active semester' }, { status: 400 });
        const g = validated.data;
        return NextResponse.json(await generateSchedulesForSection(g.sectionId, semester.id, session!.id));
      }
      case 'backup':
        // createBackup() is async (PostgreSQL path writes a logical export),
        // so it MUST be awaited — otherwise the JSON body is a Promise.
        return NextResponse.json({ path: await createBackup() });
      case 'set-availability': {
        const availabilitySchema = z.object({
          facultyId: z.number(),
          timeSlotId: z.number(),
          isAvailable: z.boolean(),
        });
        const validated = availabilitySchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid availability payload');
        const a = validated.data;
        await setFacultyAvailability(a.facultyId, a.timeSlotId, a.isAvailable, session!.id);
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
        const result = await transitionSchedule(
          t.scheduleId,
          t.toStatus,
          session!.id,
          session!.username
        );
        if (!result.ok) {
          return NextResponse.json(result, { status: 409 });
        }
        return NextResponse.json(result);
      }
      case 'reset-password': {
        const resetSchema = z.object({
          username: z.string().min(1),
          newPassword: z.string().min(8).optional(),
        });
        const validated = resetSchema.safeParse(body);
        if (!validated.success) return invalidBody('Invalid reset payload');
        const r = validated.data;
        const _adminDb = await getDb();
        const targetUser = await _adminDb.prepare('SELECT id FROM users WHERE username = ?').get(r.username) as { id: number } | undefined;
        if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        const newPassword = r.newPassword || generateRandomPassword();
        await changePassword(targetUser.id, newPassword, true);
        await logAudit(session!.id, 'RESET_PASSWORD', 'user', targetUser.id);
        return NextResponse.json({ success: true, newPassword });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    // Never leak raw SQL text to the UI.
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 400 });
  }
}
