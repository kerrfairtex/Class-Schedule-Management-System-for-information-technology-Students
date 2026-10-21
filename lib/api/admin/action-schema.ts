import { z } from 'zod';

/**
 * The admin API's request schema.
 *
 * It lives in its own module so the Master List action regression test can
 * assert against the SAME schema the route uses. A copy in the test would
 * drift and stop catching a mismatch between the form and the API.
 */

/**
 * A text field that tolerates a number.
 *
 * JSON has one number type, so a password like "224567777" is sent by some
 * clients as the number 224567777. Rejecting that made the API answer
 * "Invalid request" for a perfectly usable password, so numbers are
 * coerced to their string form instead.
 */
export const zText = z.union([z.string(), z.number()]).transform((v) => String(v));

export const AdminPostSchema = z.object({
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
  password: zText.optional(),
  subjectIds: z.array(z.number()).optional(),
  id: z.number().optional(),
  sectionId: z.number().optional(),
  scheduleId: z.number().optional(),
  timeSlotId: z.number().optional(),
  facultyId: z.number().optional(),
  isAvailable: z.boolean().optional(),
  code: zText.optional(),
  name: zText.optional(),
  credit_hours: z.number().optional(),
  program_id: z.number().optional(),
  year_level: z.number().optional(),
  semester_id: z.number().optional(),
  building_id: z.number().optional(),
  capacity: z.number().optional(),
  subject_id: z.number().optional(),
  semester_number: z.number().optional(),
  username: zText.optional(),
  role: zText.optional(),
  is_active: z.number().optional(),
  must_change_password: z.number().optional(),
  student_id: z.number().optional(),
});

export type AdminPostBody = z.infer<typeof AdminPostSchema>;
