'use client';

import { useEffect, useMemo, useState } from 'react';
import { scheduleApi, type ScheduleOptions } from '@/lib/api/client';
import type { ConflictResult } from '@/lib/domain/types';
import { DAY_LABELS, WEEK_ORDER } from '@/lib/domain/constants';

interface ManualScheduleFormProps {
  /** Called with any non-blocking warnings (e.g. faculty marked unavailable). */
  onSuccess: (warnings: string[]) => void;
  onError: (msg: string) => void;
}

type Field = 'section_id' | 'subject_id' | 'faculty_id' | 'room_id' | 'time_slot_id';
type Values = Record<Field, string>;

const EMPTY: Values = { section_id: '', subject_id: '', faculty_id: '', room_id: '', time_slot_id: '' };

const dayRank = (d: string) => {
  const i = (WEEK_ORDER as readonly string[]).indexOf(d);
  return i === -1 ? WEEK_ORDER.length : i;
};

export function ManualScheduleForm({ onSuccess, onError }: ManualScheduleFormProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ScheduleOptions | null>(null);
  const [optionsError, setOptionsError] = useState('');
  const [values, setValues] = useState<Values>(EMPTY);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [showAllFaculty, setShowAllFaculty] = useState(false);
  const [check, setCheck] = useState<ConflictResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || options) return;
    scheduleApi
      .getOptions()
      .then(setOptions)
      .catch((e: Error) => setOptionsError(e.message));
  }, [open, options]);

  const section = options?.sections.find((s) => String(s.id) === values.section_id);

  // Subjects in this section's curriculum for the active semester.
  const subjects = useMemo(() => {
    if (!options) return [];
    if (!section || showAllSubjects) return options.subjects;
    const ids = new Set(
      options.curriculum
        .filter(
          (c) =>
            c.program_id === section.program_id &&
            c.year_level === section.year_level &&
            c.semester_number === options.semesterNumber
        )
        .map((c) => c.subject_id)
    );
    return options.subjects.filter((s) => ids.has(s.id));
  }, [options, section, showAllSubjects]);

  // Faculty qualified to teach the chosen subject.
  const faculty = useMemo(() => {
    if (!options) return [];
    if (!values.subject_id || showAllFaculty) return options.faculty;
    const ids = new Set(
      options.facultySubjects.filter((fs) => String(fs.subject_id) === values.subject_id).map((fs) => fs.faculty_id)
    );
    return options.faculty.filter((f) => ids.has(f.id));
  }, [options, values.subject_id, showAllFaculty]);

  const timeSlots = useMemo(
    () =>
      [...(options?.timeSlots ?? [])].sort(
        (a, b) => dayRank(a.day_of_week) - dayRank(b.day_of_week) || a.start_time.localeCompare(b.start_time)
      ),
    [options]
  );

  const complete = Object.values(values).every(Boolean);

  // Live conflict preview once every field is chosen.
  useEffect(() => {
    if (!complete) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setChecking(true);
      scheduleApi
        .check({
          section_id: Number(values.section_id),
          subject_id: Number(values.subject_id),
          faculty_id: Number(values.faculty_id),
          room_id: Number(values.room_id),
          time_slot_id: Number(values.time_slot_id),
        })
        .then((r) => !cancelled && setCheck(r))
        .catch(() => !cancelled && setCheck(null))
        .finally(() => !cancelled && setChecking(false));
    });
    return () => {
      cancelled = true;
    };
  }, [complete, values]);

  function set(field: Field, value: string) {
    setCheck(null);
    setValues((v) => {
      const next = { ...v, [field]: value };
      // A new section can change which subjects apply; a new subject which faculty.
      if (field === 'section_id') next.subject_id = '';
      if (field === 'section_id' || field === 'subject_id') next.faculty_id = '';
      return next;
    });
  }

  function close() {
    setOpen(false);
    setValues(EMPTY);
    setCheck(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!options?.semester) {
      onError('No active semester. Activate a semester before scheduling.');
      return;
    }
    setSaving(true);
    try {
      const created = await scheduleApi.create({
        section_id: Number(values.section_id),
        subject_id: Number(values.subject_id),
        faculty_id: Number(values.faculty_id),
        room_id: Number(values.room_id),
        time_slot_id: Number(values.time_slot_id),
        semester_id: options.semester.id,
      });
      onSuccess(created.warnings ?? []);
      close();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create schedule');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        Add Schedule Manually
      </button>
    );
  }

  const blocking = check?.blockingConflicts ?? [];
  const warnings = check?.nonBlockingConflicts ?? [];

  return (
    <form onSubmit={handleSubmit} className="card mb-6 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="flex items-center justify-between sm:col-span-2 lg:col-span-3">
        <h2 className="font-semibold">Manual Schedule Entry (MOD-05)</h2>
        <button type="button" onClick={close} className="text-sm text-muted underline-offset-2 hover:underline">
          Close
        </button>
      </div>

      {optionsError && (
        <p role="alert" className="rounded bg-coral-50 px-3 py-2 text-sm text-coral sm:col-span-2 lg:col-span-3">
          Could not load form options: {optionsError}
        </p>
      )}
      {!options && !optionsError && (
        <p role="status" className="text-sm text-muted sm:col-span-2 lg:col-span-3">
          Loading options…
        </p>
      )}
      {options && !options.semester && (
        <p role="alert" className="rounded bg-sand px-3 py-2 text-sm text-ink sm:col-span-2 lg:col-span-3">
          No active semester. Activate one in Settings before scheduling.
        </p>
      )}

      <SelectField
        name="section_id"
        label="Section"
        value={values.section_id}
        onChange={(v) => set('section_id', v)}
        options={options?.sections.map((s) => ({ value: s.id, label: s.code })) ?? []}
      />

      <div>
        <SelectField
          name="subject_id"
          label="Subject"
          value={values.subject_id}
          onChange={(v) => set('subject_id', v)}
          disabled={!values.section_id}
          options={subjects.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
          emptyHint={section ? 'No subjects in this section’s curriculum for this semester' : 'Choose a section first'}
        />
        <Toggle
          id="all-subjects"
          checked={showAllSubjects}
          onChange={setShowAllSubjects}
          label="Include subjects outside the curriculum"
        />
      </div>

      <div>
        <SelectField
          name="faculty_id"
          label="Faculty"
          value={values.faculty_id}
          onChange={(v) => set('faculty_id', v)}
          disabled={!values.subject_id}
          options={faculty.map((f) => ({ value: f.id, label: `${f.employee_id} — ${f.first_name} ${f.last_name}` }))}
          emptyHint={values.subject_id ? 'No faculty assigned to this subject' : 'Choose a subject first'}
        />
        <Toggle
          id="all-faculty"
          checked={showAllFaculty}
          onChange={setShowAllFaculty}
          label="Include faculty not assigned to this subject"
        />
      </div>

      <SelectField
        name="room_id"
        label="Room"
        value={values.room_id}
        onChange={(v) => set('room_id', v)}
        options={
          options?.rooms.map((r) => {
            const tooSmall = !!section && r.capacity < section.capacity;
            return {
              value: r.id,
              label: `${r.code} — ${r.name} (${r.capacity} seats${tooSmall ? ', too small' : ''})`,
              disabled: tooSmall,
            };
          }) ?? []
        }
      />

      <SelectField
        name="time_slot_id"
        label="Time Slot"
        value={values.time_slot_id}
        onChange={(v) => set('time_slot_id', v)}
        options={timeSlots.map((t) => ({
          value: t.id,
          label: `${DAY_LABELS[t.day_of_week] ?? t.day_of_week} ${t.start_time}–${t.end_time}`,
        }))}
      />

      <div aria-live="polite" className="text-sm sm:col-span-2 lg:col-span-3">
        {checking && <p className="text-muted">Checking for conflicts…</p>}
        {!checking && check && blocking.length === 0 && warnings.length === 0 && (
          <p className="rounded bg-seagrass-50 px-3 py-2 text-seagrass">No conflicts. This slot is free.</p>
        )}
        {blocking.length > 0 && (
          <ul role="alert" className="list-inside list-disc rounded bg-coral-50 px-3 py-2 text-coral">
            {blocking.map((c) => (
              <li key={c.kind}>{c.message}</li>
            ))}
          </ul>
        )}
        {warnings.length > 0 && (
          <ul className="mt-2 list-inside list-disc rounded bg-sand px-3 py-2 text-ink">
            {warnings.map((c) => (
              <li key={c.kind}>Warning: {c.message}. You can still save.</li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || !complete || blocking.length > 0 || !options?.semester}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-3"
      >
        {saving ? 'Saving…' : 'Create draft class'}
      </button>
    </form>
  );
}

function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  disabled,
  emptyHint,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: number; label: string; disabled?: boolean }[];
  disabled?: boolean;
  emptyHint?: string;
}) {
  const id = `msf-${name}`;
  const noOptions = !disabled && options.length === 0 && emptyHint;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <select
        id={id}
        name={name}
        required
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="input-field disabled:cursor-not-allowed disabled:bg-paper-2"
        aria-describedby={noOptions || disabled ? `${id}-hint` : undefined}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {(noOptions || (disabled && emptyHint)) && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {emptyHint}
        </p>
      )}
    </div>
  );
}

function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="mt-1 flex items-center gap-2 text-xs text-muted">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
