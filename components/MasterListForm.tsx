'use client';

import { useState } from 'react';

interface Meta {
  programs: { id: number; code: string }[];
  departments: { id: number; code: string }[];
  sections: { id: number; code: string }[];
  buildings: { id: number; code: string }[];
  subjects: { id: number; code: string; name: string }[];
  semester: { id: number; name: string } | null;
}

interface MasterListFormProps {
  tab: string;
  meta: Meta;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function MasterListForm({ tab, meta, onSuccess, onError }: MasterListFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      let body: Record<string, unknown> = {};
      switch (tab) {
        case 'faculty':
          body = {
            action: 'create-faculty',
            password: payload.password || 'faculty123',
            subjectIds: [Number(payload.subject_id)].filter(Boolean),
            data: {
              employee_id: payload.employee_id,
              first_name: payload.first_name,
              last_name: payload.last_name,
              email: payload.email,
              phone: payload.phone,
              department_id: Number(payload.department_id),
            },
          };
          break;
        case 'students':
          body = {
            action: 'create-student',
            password: payload.password || 'student123',
            data: {
              student_id: payload.student_id,
              first_name: payload.first_name,
              last_name: payload.last_name,
              email: payload.email,
              section_id: Number(payload.section_id),
            },
          };
          break;
        case 'subjects':
          body = {
            action: 'create-subject',
            code: payload.code,
            name: payload.name,
            credit_hours: Number(payload.credit_hours),
            program_id: Number(payload.program_id),
          };
          break;
        case 'sections':
          body = {
            action: 'create-section',
            code: payload.code,
            program_id: Number(payload.program_id),
            year_level: Number(payload.year_level),
            semester_id: Number(payload.semester_id),
          };
          break;
        case 'rooms':
          body = {
            action: 'create-room',
            building_id: Number(payload.building_id),
            code: payload.code,
            name: payload.name,
            capacity: Number(payload.capacity),
          };
          break;
        default:
          return;
      }

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess('Record created successfully');
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create record');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary mb-4">
        Add {tabLabel(tab)}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card mb-6 grid gap-4 sm:grid-cols-2">
      <div className="flex items-center justify-between sm:col-span-2">
        <h3 className="font-semibold">Add {tabLabel(tab)}</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">
          Cancel
        </button>
      </div>

      {tab === 'faculty' && (
        <>
          <Field name="employee_id" label="Employee ID" required />
          <Field name="password" label="Login Password" placeholder="faculty123" />
          <Field name="first_name" label="First Name" required />
          <Field name="last_name" label="Last Name" required />
          <Field name="email" label="Email" type="email" />
          <Field name="phone" label="Phone" />
          <Select name="department_id" label="Department" options={meta.departments} required />
          <Select
            name="subject_id"
            label="Primary Subject"
            options={meta.subjects.map((s) => ({ id: s.id, code: `${s.code} — ${s.name}` }))}
          />
        </>
      )}

      {tab === 'students' && (
        <>
          <Field name="student_id" label="Student ID" required />
          <Field name="password" label="Login Password" placeholder="student123" />
          <Field name="first_name" label="First Name" required />
          <Field name="last_name" label="Last Name" required />
          <Field name="email" label="Email" type="email" />
          <Select name="section_id" label="Section" options={meta.sections} required />
        </>
      )}

      {tab === 'subjects' && (
        <>
          <Field name="code" label="Subject Code" required />
          <Field name="name" label="Subject Name" required />
          <Field name="credit_hours" label="Credit Hours" type="number" defaultValue="3" required />
          <Select name="program_id" label="Program" options={meta.programs} required />
        </>
      )}

      {tab === 'sections' && (
        <>
          <Field name="code" label="Section Code" required placeholder="BSIT-2A" />
          <Select name="program_id" label="Program" options={meta.programs} required />
          <Field name="year_level" label="Year Level" type="number" defaultValue="1" required />
          <input type="hidden" name="semester_id" value={meta.semester?.id ?? ''} />
          <div className="text-sm text-slate-500">
            Active semester: {meta.semester?.name ?? 'None'}
          </div>
        </>
      )}

      {tab === 'rooms' && (
        <>
          <Select name="building_id" label="Building" options={meta.buildings} required />
          <Field name="code" label="Room Code" required />
          <Field name="name" label="Room Name" required />
          <Field name="capacity" label="Capacity" type="number" defaultValue="40" required />
        </>
      )}

      <button type="submit" disabled={loading} className="btn-primary sm:col-span-2">
        {loading ? 'Saving...' : 'Save'}
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
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="input-field"
      />
    </div>
  );
}

function Select({
  name,
  label,
  options,
  required,
}: {
  name: string;
  label: string;
  options: { id: number; code: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select name={name} required={required} className="input-field">
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.code}
          </option>
        ))}
      </select>
    </div>
  );
}
