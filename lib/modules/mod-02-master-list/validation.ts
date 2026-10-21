/**
 * Shared form-value coercion and validation for Master List (MOD-02) payloads.
 *
 * RULE: a NaN or undefined value must never reach an integer column.
 * `Number('')` is 0 and `Number(undefined)` is NaN — both are silent traps that
 * surface as PostgreSQL 'invalid input syntax for type integer: "NaN"'.
 * Every numeric field is parsed exactly once, through `toInt`, which either
 * returns a safe integer or throws a `ValidationError` carrying a field name
 * and a human-readable message.
 */

export class ValidationError extends Error {
  readonly field: string;
  readonly details: Record<string, string>;

  constructor(field: string, message: string, details: Record<string, string> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.details = details;
  }
}

export type FieldErrors = Record<string, string>;

/** Result of coercing a whole payload. */
export interface CoerceResult<T> {
  ok: boolean;
  value?: T;
  errors: FieldErrors;
}

/**
 * Coerce a required integer field.
 * Accepts a number or a numeric string; rejects '', null, undefined, NaN,
 * Infinity, floats with a fractional part, and non-numeric text.
 */
export function toInt(raw: unknown, field: string, errors: FieldErrors, opts: { min?: number; max?: number } = {}): number | undefined {
  if (raw === null || raw === undefined || raw === '') {
    errors[field] = `${field} is required`;
    return undefined;
  }
  let n: number;
  if (typeof raw === 'number') {
    n = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') {
      errors[field] = `${field} is required`;
      return undefined;
    }
    n = Number(trimmed);
  } else {
    errors[field] = `${field} must be a number`;
    return undefined;
  }

  if (!Number.isFinite(n)) {
    errors[field] = `${field} must be a valid number`;
    return undefined;
  }
  if (!Number.isInteger(n)) {
    errors[field] = `${field} must be a whole number`;
    return undefined;
  }
  if (opts.min !== undefined && n < opts.min) {
    errors[field] = `${field} must be at least ${opts.min}`;
    return undefined;
  }
  if (opts.max !== undefined && n > opts.max) {
    errors[field] = `${field} must be at most ${opts.max}`;
    return undefined;
  }
  return n;
}

/**
 * Coerce an optional integer field. Empty/absent values become undefined
 * (caller decides whether to store null) instead of NaN or a silent 0.
 */
export function toOptionalInt(
  raw: unknown,
  field: string,
  errors: FieldErrors,
  opts: { min?: number; max?: number } = {}
): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  return toInt(raw, field, errors, opts);
}

/**
 * Coerce a required text field. Returns a trimmed string.
 */
export function toText(raw: unknown, field: string, errors: FieldErrors, opts: { min?: number; max?: number; pattern?: RegExp; patternMessage?: string } = {}): string | undefined {
  if (raw === null || raw === undefined) {
    errors[field] = `${field} is required`;
    return undefined;
  }
  if (typeof raw !== 'string') {
    errors[field] = `${field} must be text`;
    return undefined;
  }
  const trimmed = raw.trim();
  const min = opts.min ?? 1;
  if (trimmed.length < min) {
    errors[field] = `${field} is required`;
    return undefined;
  }
  if (opts.max !== undefined && trimmed.length > opts.max) {
    errors[field] = `${field} must be at most ${opts.max} characters`;
    return undefined;
  }
  if (opts.pattern && !opts.pattern.test(trimmed)) {
    errors[field] = opts.patternMessage ?? `${field} has an invalid format`;
    return undefined;
  }
  return trimmed;
}

/**
 * Coerce an optional text field (email, phone). Empty becomes undefined.
 */
export function toOptionalText(
  raw: unknown,
  field: string,
  errors: FieldErrors,
  opts: { min?: number; max?: number; pattern?: RegExp; patternMessage?: string } = {}
): string | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  return toText(raw, field, errors, { min: opts.min ?? 1, ...opts });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function toEmail(raw: unknown, field: string, errors: FieldErrors): string | undefined {
  if (raw === null || raw === undefined || raw === '') {
    errors[field] = 'Email is required';
    return undefined;
  }
  const value = toText(raw, field, errors, { max: 254 });
  if (value === undefined) return undefined;
  if (!EMAIL_RE.test(value)) {
    errors[field] = 'Enter a valid email address';
    return undefined;
  }
  return value;
}

/**
 * Coerce an optional email field. Empty becomes undefined; a provided value
 * must be a valid address.
 */
export function toOptionalEmail(
  raw: unknown,
  field: string,
  errors: FieldErrors
): string | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  return toEmail(raw, field, errors);
}

/**
 * Student / employee identifiers are stored as TEXT (see csms.students.student_id
 * and csms.faculty.employee_id) so both '2022-0001' and '20250001' are valid.
 */
export function toIdentifier(raw: unknown, field: string, errors: FieldErrors): string | undefined {
  const value = toText(raw, field, errors, { min: 1, max: 64 });
  if (value === undefined) return undefined;
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    errors[field] = `${field} may only contain letters, numbers, dots, dashes and underscores`;
    return undefined;
  }
  return value;
}

/**
 * Coerce a list of numeric ids (e.g. faculty subject assignments).
 * Non-numeric entries are dropped and reported rather than becoming NaN.
 */
export function toIntArray(raw: unknown, field: string, errors: FieldErrors): number[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) {
    errors[field] = `${field} must be a list`;
    return [];
  }
  const out: number[] = [];
  raw.forEach((entry, i) => {
    if (entry === null || entry === undefined || entry === '') return;
    const n = toInt(entry, `${field}[${i}]`, errors, { min: 1 });
    if (n !== undefined) out.push(n);
  });
  return out;
}

/** Collect field errors into a single message. */
export function formatFieldErrors(errors: FieldErrors): string {
  const entries = Object.entries(errors);
  if (entries.length === 0) return 'Validation failed';
  return entries.map(([field, message]) => `${field}: ${message}`).join('; ');
}

/**
 * Map a PostgreSQL error to a friendly, actionable message.
 * Never leaks raw SQL text to the UI.
 */
export function friendlyDbError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const code = (err as any)?.code;

  if (code === '23505' || /duplicate key value violates unique constraint/i.test(raw)) {
    const m = /unique constraint "([^"]+)"/i.exec(raw);
    const constraint = m?.[1] ?? '';
    if (constraint.startsWith('students_student_id')) return 'That Student ID is already in use';
    if (constraint.startsWith('faculty_employee_id')) return 'That Employee ID is already in use';
    if (constraint.startsWith('subjects_code')) return 'That Subject Code already exists';
    if (constraint.startsWith('sections_code')) return 'That Section Code already exists';
    if (constraint.startsWith('users_username')) return 'That Username already exists';
    if (constraint.startsWith('rooms_building_id_code')) return 'That Room Code already exists in this building';
    return 'That record already exists';
  }
  if (code === '23503' || /foreign key constraint/i.test(raw)) {
    if (/students_section_id_fkey/.test(raw)) return 'The selected Section no longer exists';
    if (/faculty_department_id_fkey/.test(raw)) return 'The selected Department no longer exists';
    if (/rooms_building_id_fkey/.test(raw)) return 'The selected Building no longer exists';
    if (/subjects_program_id_fkey/.test(raw)) return 'The selected Program no longer exists';
    if (/sections_program_id_fkey/.test(raw)) return 'The selected Program no longer exists';
    if (/sections_semester_id_fkey/.test(raw)) return 'The selected Semester no longer exists';
    if (/users_student_id_fkey/.test(raw)) return 'The linked Student record no longer exists';
    if (/users_faculty_id_fkey/.test(raw)) return 'The linked Faculty record no longer exists';
    return 'That record is still referenced by other records';
  }
  if (code === '23502' || /null value in column/i.test(raw)) {
    const m = /null value in column "([^"]+)"/i.exec(raw);
    return m ? `${m[1]} is required` : 'A required value was missing';
  }
  if (/invalid input syntax for type integer/i.test(raw)) {
    return 'A numeric field received an invalid value';
  }
  if (code === '22001' || /value too long/i.test(raw)) {
    return 'One of the values is too long for its field';
  }
  if (err instanceof ValidationError) return err.message;
  // Domain rules (e.g. "Cannot delete a Section that still has students")
  // are already user-facing; surface them verbatim.
  if (err instanceof Error && /^(Cannot|Duplicate|That |The |Invalid )/.test(err.message)) {
    return err.message;
  }
  return 'The record could not be saved';
}
