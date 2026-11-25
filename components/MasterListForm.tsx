'use client';

import { useState } from 'react';
import {
  toInt,
  toOptionalInt,
  toText,
  toOptionalText,
  toOptionalEmail,
  toIdentifier,
  toIntArray,
  type FieldErrors,
} from '@/lib/modules/mod-02-master-list/validation';
import {
  masterListAction,
  type MasterListTab,
} from '@/lib/modules/mod-02-master-list/actions';

interface Meta {
  programs: { id: number; code: string }[];
  departments: { id: number; code: string }[];
  sections: { id: number; code: string }[];
  buildings: { id: number; code: string }[];
  subjects: { id: number; code: string; name: string }[];
  faculty?: { id: number; code: string }[];
  rooms?: { id: number; code: string }[];
  semester: { id: number; name: string } | null;
}


export interface EditingRecord {
  id: number;
  values: Record<string, string>;
}

interface MasterListFormProps {
  tab: MasterListTab;
  meta: Meta;
  /** When set, the form is in Edit mode for this row. */
  editing: EditingRecord | null;
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

type Mode = 'create' | 'edit';

export function MasterListForm({
  tab,
  meta,
  editing,
  onCancel,
  onSuccess,
  onError,
}: MasterListFormProps) {
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Edit mode is driven by the parent (the page owns the table and the
  // Edit/Delete buttons), so the form never has to guess which row is active.
  const mode: Mode = editing ? 'edit' : 'create';
  const editId = editing ? editing.id : null;
  const editValues = editing ? editing.values : {};

  // Clear stale field errors when the tab changes. Same render-time
  // adjustment pattern as the page: React discards this render output and
  // re-renders immediately, so no cascading render is scheduled.
  const [lastTab, setLastTab] = useState(tab);
  if (lastTab !== tab) {
    setLastTab(tab);
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return; // no double submits

    const form = new FormData(e.currentTarget);
    const raw = Object.fromEntries(form.entries()) as Record<string, string>;
    const errors: FieldErrors = {};
    const body: Record<string, unknown> = {};
    const isEdit = mode === 'edit' && editId !== null;

    // Parse once, validate, and never let a NaN leave this function.
    switch (tab) {
      case 'faculty': {
        body.subjectIds = toIntArray(
          raw.subject_id ? [raw.subject_id] : [],
          'subjectIds',
          errors
        );
        body.data = {
          employee_id: toIdentifier(raw.employee_id, 'employee_id', errors),
          first_name: toText(raw.first_name, 'first_name', errors, { max: 120 }),
          last_name: toText(raw.last_name, 'last_name', errors, { max: 120 }),
          email: toOptionalEmail(raw.email, 'email', errors),
          phone: toOptionalText(raw.phone, 'phone', errors, { max: 40 }),
          department_id: toInt(raw.department_id, 'department_id', errors, { min: 1 }),
        };
        body.password = raw.password || undefined;
        break;
      }
      case 'students': {
        body.data = {
          student_id: toIdentifier(raw.student_id, 'student_id', errors),
          first_name: toText(raw.first_name, 'first_name', errors, { max: 120 }),
          last_name: toText(raw.last_name, 'last_name', errors, { max: 120 }),
          email: toOptionalEmail(raw.email, 'email', errors),
          section_id: toInt(raw.section_id, 'section_id', errors, { min: 1 }),
        };
        break;
      }
      case 'subjects': {
        body.code = toText(raw.code, 'code', errors, { max: 32 });
        body.name = toText(raw.name, 'name', errors, { max: 160 });
        body.program_id = toInt(raw.program_id, 'program_id', errors, { min: 1 });
        // Total units = lecture + lab units (computed on the server).
        body.lec_units = toInt(raw.lec_units ?? '0', 'lec_units', errors, { min: 0, max: 12 });
        body.lab_units = toInt(raw.lab_units ?? '0', 'lab_units', errors, { min: 0, max: 12 });
        body.lec_hours = raw.lec_hours === '' ? undefined : Number(raw.lec_hours);
        body.lab_hours = raw.lab_hours === '' ? undefined : Number(raw.lab_hours);
        break;
      }
      case 'sections': {
        body.code = toText(raw.code, 'code', errors, { max: 32 });
        body.program_id = toInt(raw.program_id, 'program_id', errors, { min: 1 });
        body.year_level = toInt(raw.year_level, 'year_level', errors, { min: 1, max: 8 });
        body.semester_id = toInt(
          raw.semester_id || (meta.semester?.id ?? ''),
          'semester_id',
          errors,
          { min: 1 }
        );
        body.capacity = raw.capacity ? toInt(raw.capacity, 'capacity', errors, { min: 1, max: 500 }) : undefined;
        body.adviser_id = raw.adviser_id ? toInt(raw.adviser_id, 'adviser_id', errors, { min: 1 }) : undefined;
        body.home_room_id = raw.home_room_id ? toInt(raw.home_room_id, 'home_room_id', errors, { min: 1 }) : undefined;
        break;
      }
      case 'rooms': {
        body.building_id = toInt(raw.building_id, 'building_id', errors, { min: 1 });
        body.code = toText(raw.code, 'code', errors, { max: 32 });
        body.name = toText(raw.name, 'name', errors, { max: 160 });
        body.capacity = toInt(raw.capacity, 'capacity', errors, { min: 1, max: 2000 });
        body.room_type = raw.room_type || 'LECTURE';
        break;
      }
      case 'users': {
        body.data = {
          username: toText(raw.username, 'username', errors, { max: 120 }),
          role: toText(raw.role, 'role', errors, { max: 20 }),
          is_active: toInt(raw.is_active ?? '1', 'is_active', errors, { min: 0, max: 1 }),
          must_change_password: toInt(
            raw.must_change_password ?? '0',
            'must_change_password',
            errors,
            { min: 0, max: 1 }
          ),
          faculty_id: toOptionalInt(raw.faculty_id, 'faculty_id', errors, { min: 1 }),
          student_id: toOptionalInt(raw.student_id, 'student_id', errors, { min: 1 }),
        };
        body.password = raw.password || undefined;
        break;
      }
      default:
        return;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      onError('Please correct the highlighted fields');
      return;
    }
    setFieldErrors({});

    if (isEdit) {
      body.action = masterListAction(tab, 'update');
      body.id = editId;
    } else {
      body.action = masterListAction(tab, 'create');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields && Object.keys(data.fields).length > 0) {
          setFieldErrors(data.fields as FieldErrors);
        }
        throw new Error(data.error || 'Failed to save record');
      }
      onSuccess(
        isEdit
          ? 'Record updated successfully'
          : data.temporaryPassword
            ? `Record created. Temporary password: ${data.temporaryPassword} — give it to the user privately; they must change it at first login. It will not be shown again.`
            : 'Record created successfully'
      );
      onCancel();
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setLoading(false);
    }
  }

  const defaults = editValues;

  return (
    <form
      key={editId ?? 'create'}
      onSubmit={submit}
      className="card mb-6 grid gap-4 sm:grid-cols-2"
      noValidate
    >
      <div className="flex items-center justify-between sm:col-span-2">
        <h3 className="font-semibold">
          {mode === 'edit' ? 'Edit' : 'Add'} {tabLabel(tab)}
        </h3>
        <button
          type="button"
          onClick={() => {
            onCancel();
            setFieldErrors({});
          }}
          className="text-sm text-muted hover:text-ink-soft"
        >
          Cancel
        </button>
      </div>

      {tab === 'faculty' && (
        <>
          <Field name="employee_id" label="Employee ID" required defaultValue={defaults.employee_id} error={fieldErrors.employee_id} />
          <Field name="first_name" label="First Name" required defaultValue={defaults.first_name} error={fieldErrors.first_name} />
          <Field name="last_name" label="Last Name" required defaultValue={defaults.last_name} error={fieldErrors.last_name} />
          <Field name="email" label="Email" type="email" defaultValue={defaults.email} error={fieldErrors.email} />
          <Field name="phone" label="Phone" defaultValue={defaults.phone} error={fieldErrors.phone} />
          <Select
            name="department_id"
            label="Department"
            options={meta.departments}
            required
            defaultValue={defaults.department_id}
            error={fieldErrors.department_id}
          />
          <Select
            name="subject_id"
            label="Primary Subject"
            options={meta.subjects.map((s) => ({ id: s.id, code: `${s.code} — ${s.name}` }))}
            defaultValue={defaults.subject_id}
            error={fieldErrors.subjectIds}
          />
        </>
      )}

      {tab === 'students' && (
        <>
          <Field
            name="student_id"
            label="Student ID"
            required
            defaultValue={defaults.student_id}
            error={fieldErrors.student_id}
            hint="e.g. 2022-0001 or 20250001"
          />
          {mode === 'create' && (
            <Field name="password" label="Login Password" placeholder="Leave blank to generate a temporary password" error={fieldErrors.password} />
          )}
          <Field name="first_name" label="First Name" required defaultValue={defaults.first_name} error={fieldErrors.first_name} />
          <Field name="last_name" label="Last Name" required defaultValue={defaults.last_name} error={fieldErrors.last_name} />
          <Field name="email" label="Email" type="email" defaultValue={defaults.email} error={fieldErrors.email} />
          <Select
            name="section_id"
            label="Section"
            options={meta.sections}
            required
            defaultValue={defaults.section_id}
            error={fieldErrors.section_id}
          />
        </>
      )}

      {tab === 'subjects' && (
        <>
          <Field name="code" label="Subject code" required placeholder="IT 121" defaultValue={defaults.code} error={fieldErrors.code} />
          <Field
            name="name"
            label="Descriptive title"
            required
            placeholder="Data Structures and Algorithms"
            defaultValue={defaults.name}
            error={fieldErrors.name}
          />
          <Field name="lec_units" label="Lecture units" type="number" min="0" max="12" defaultValue={defaults.lec_units ?? '3'} required error={fieldErrors.lec_units} />
          <Field name="lab_units" label="Lab units" type="number" min="0" max="12" defaultValue={defaults.lab_units ?? '0'} required error={fieldErrors.lab_units} />
          <Field
            name="lec_hours"
            label="Lecture hours a week"
            type="number"
            step="0.5"
            min="0"
            max="40"
            defaultValue={defaults.lec_hours}
            error={fieldErrors.lec_hours}
            hint="Leave blank to use one hour per lecture unit"
          />
          <Field
            name="lab_hours"
            label="Lab hours a week"
            type="number"
            step="0.5"
            min="0"
            max="40"
            defaultValue={defaults.lab_hours}
            error={fieldErrors.lab_hours}
            hint="Often 3 hours per lab unit"
          />
          <Select
            name="program_id"
            label="Program"
            options={meta.programs}
            required
            defaultValue={defaults.program_id}
            error={fieldErrors.program_id}
          />
        </>
      )}

      {tab === 'sections' && (
        <>
          <Field name="code" label="Section Code" required placeholder="BSIT-2A" defaultValue={defaults.code} error={fieldErrors.code} />
          <Select
            name="program_id"
            label="Program"
            options={meta.programs}
            required
            defaultValue={defaults.program_id}
            error={fieldErrors.program_id}
          />
          <Field
            name="year_level"
            label="Year Level"
            type="number"
            defaultValue={defaults.year_level ?? '1'}
            required
            error={fieldErrors.year_level}
          />
          <Field name="capacity" label="Class size" type="number" min="1" max="500" defaultValue={defaults.capacity ?? '40'} error={fieldErrors.capacity} hint="Rooms smaller than this are flagged" />
          <Select name="adviser_id" label="Adviser" options={meta.faculty ?? []} defaultValue={defaults.adviser_id} error={fieldErrors.adviser_id} emptyLabel="No adviser yet" />
          <Select name="home_room_id" label="Home room" options={meta.rooms ?? []} defaultValue={defaults.home_room_id} error={fieldErrors.home_room_id} emptyLabel="No home room" />
          <input type="hidden" name="semester_id" value={defaults.semester_id || meta.semester?.id || ''} />
          <div className="text-sm text-muted">
            Active semester: {meta.semester?.name ?? 'None'}
          </div>
        </>
      )}

      {tab === 'rooms' && (
        <>
          <Select
            name="building_id"
            label="Building"
            options={meta.buildings}
            required
            defaultValue={defaults.building_id}
            error={fieldErrors.building_id}
          />
          <Field name="code" label="Room Code" required defaultValue={defaults.code} error={fieldErrors.code} />
          <Field name="name" label="Room Name" required defaultValue={defaults.name} error={fieldErrors.name} />
          <Field
            name="capacity"
            label="Capacity"
            type="number"
            defaultValue={defaults.capacity ?? '40'}
            required
            error={fieldErrors.capacity}
          />
          <Select
            name="room_type"
            label="Room type"
            options={[]}
            stringOptions={[
              { value: 'LECTURE', label: 'Lecture room' },
              { value: 'LAB', label: 'Laboratory' },
            ]}
            required
            defaultValue={defaults.room_type ?? 'LECTURE'}
            error={fieldErrors.room_type}
          />
        </>
      )}

      {tab === 'users' && (
        <>
          <Field name="username" label="Username" required defaultValue={defaults.username} error={fieldErrors.username} />
          {mode === 'create' && (
            <Field name="password" label="Password" placeholder="Leave blank to generate a temporary password" error={fieldErrors.password} />
          )}
          <Select
            name="role"
            label="Role"
            options={[
              { id: 1, code: 'admin' },
              { id: 2, code: 'faculty' },
            ]}
            required
            defaultValue={defaults.role}
            error={fieldErrors.role}
          />
          <Select
            name="is_active"
            label="Active"
            options={[
              { id: 1, code: 'Yes' },
              { id: 0, code: 'No' },
            ]}
            required
            defaultValue={defaults.is_active ?? '1'}
            error={fieldErrors.is_active}
          />
          <Select
            name="must_change_password"
            label="Must Change Password"
            options={[
              { id: 0, code: 'No' },
              { id: 1, code: 'Yes' },
            ]}
            required
            defaultValue={defaults.must_change_password ?? '0'}
            error={fieldErrors.must_change_password}
          />
        </>
      )}

      <button type="submit" disabled={loading} className="btn-primary sm:col-span-2">
        {loading ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Save'}
      </button>
    </form>
  );
}

function tabLabel(tab: string) {
  const labels: Record<string, string> = {
    faculty: 'Faculty',
    students: 'Student',
    subjects: 'Subject',
    sections: 'Section',
    rooms: 'Room',
    users: 'User',
  };
  return labels[tab] || tab;
}

function Field({
  name,
  label,
  type = 'text',
  required,
  placeholder,
  defaultValue,
  error,
  hint,
  step,
  min,
  max,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  const id = `ml-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label-field">{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        step={step}
        min={min}
        max={max}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={`input-field ${error ? 'input-field-error' : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
      />
      {hint && !error && <p id={`${name}-hint`} className="hint">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  );
}

function Select({
  name,
  label,
  options,
  required,
  defaultValue,
  error,
  emptyLabel = 'Select...',
  stringOptions,
}: {
  name: string;
  label: string;
  options: { id: number; code: string }[];
  required?: boolean;
  defaultValue?: string;
  error?: string;
  emptyLabel?: string;
  /** For non-numeric choices such as room type. */
  stringOptions?: { value: string; label: string }[];
}) {
  const id = `ml-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label-field">{label}</label>
      <select
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ''}
        className={`input-field ${error ? 'input-field-error' : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        {!stringOptions && <option value="">{emptyLabel}</option>}
        {stringOptions?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.code}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  );
}
