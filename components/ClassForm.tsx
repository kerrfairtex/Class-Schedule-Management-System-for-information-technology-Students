'use client';

import { useEffect, useMemo, useState } from 'react';
import { scheduleApi, type LoadRow, type ScheduleOptions } from '@/lib/api/client';
import type { ClassComponent, ConflictResult, Schedule } from '@/lib/domain/types';
import { DAY_LABELS, WEEK_ORDER } from '@/lib/domain/constants';
import { toHHMM, toMin } from '@/components/TimeGrid';

/**
 * Add a class (one subject part, on one or more days, any start time and
 * length) or edit an existing class meeting. Every change is checked for
 * conflicts on each chosen day before it can be saved.
 */

const LENGTHS = [60, 90, 120, 150, 180, 240];
const lengthLabel = (m: number) => `${m / 60} hour${m === 60 ? '' : 's'}`;
const to12h = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const BOARD_DAYS = WEEK_ORDER.filter((d) => d !== 'sunday');

interface Props {
  options: ScheduleOptions;
  /** Present when editing one class meeting. */
  editing?: Schedule;
  defaultSectionId?: number | null;
  onSaved: (message: string) => void;
  onCancel: () => void;
}

export function ClassForm({ options, editing, defaultSectionId, onSaved, onCancel }: Props) {
  const isEdit = !!editing;
  const [sectionId, setSectionId] = useState(String(editing?.section_id ?? defaultSectionId ?? ''));
  const [subjectId, setSubjectId] = useState(String(editing?.subject_id ?? ''));
  const [component, setComponent] = useState<ClassComponent>(editing?.component ?? 'LEC');
  const [facultyId, setFacultyId] = useState(String(editing?.faculty_id ?? ''));
  const [roomId, setRoomId] = useState(String(editing?.room_id ?? ''));
  const [days, setDays] = useState<string[]>(editing?.day_of_week ? [editing.day_of_week] : []);
  const [start, setStart] = useState(editing?.start_time ?? '07:30');
  const initialLength = editing?.start_time && editing.end_time ? toMin(editing.end_time) - toMin(editing.start_time) : 60;
  const [length, setLength] = useState<number | 'custom'>(LENGTHS.includes(initialLength) ? initialLength : 'custom');
  const [customEnd, setCustomEnd] = useState(editing?.end_time ?? '08:30');
  const [allSubjects, setAllSubjects] = useState(false);
  const [check, setCheck] = useState<Record<string, ConflictResult> | null>(null);
  const [checkError, setCheckError] = useState('');
  const [load, setLoad] = useState<LoadRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const section = options.sections.find((s) => String(s.id) === sectionId);
  const end = length === 'custom' ? customEnd : start ? toHHMM(toMin(start) + length) : '';

  const subjects = useMemo(() => {
    if (!section || allSubjects) return options.subjects;
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
    return options.subjects.filter((s) => ids.has(s.id) || String(s.id) === subjectId);
  }, [options, section, allSubjects, subjectId]);

  const faculty = useMemo(() => {
    if (!subjectId) return options.faculty;
    const ids = new Set(options.facultySubjects.filter((fs) => String(fs.subject_id) === subjectId).map((fs) => fs.faculty_id));
    return options.faculty.filter((f) => ids.has(f.id) || String(f.id) === facultyId);
  }, [options, subjectId, facultyId]);

  // Labs first for a lab part, lecture rooms first for a lecture.
  const rooms = useMemo(() => {
    const want = component === 'LAB' ? 'LAB' : 'LECTURE';
    return [...options.rooms].sort(
      (a, b) => Number((b.room_type ?? 'LECTURE') === want) - Number((a.room_type ?? 'LECTURE') === want) || a.code.localeCompare(b.code)
    );
  }, [options.rooms, component]);

  // Required vs scheduled hours for the chosen section.
  useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;
    scheduleApi
      .sectionLoad(Number(sectionId))
      .then((rows) => !cancelled && setLoad(rows))
      .catch(() => !cancelled && setLoad([]));
    return () => {
      cancelled = true;
    };
  }, [sectionId]);

  const complete = !!(sectionId && subjectId && facultyId && roomId && days.length && start && end && end > start);

  // Live conflict preview for each chosen day.
  useEffect(() => {
    if (!complete) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      scheduleApi
        .check({
          section_id: Number(sectionId),
          subject_id: Number(subjectId),
          faculty_id: Number(facultyId),
          room_id: Number(roomId),
          component,
          days,
          start_time: start,
          end_time: end,
          exclude: editing?.id,
        })
        .then((r) => {
          if (cancelled) return;
          setCheck(r.days);
          setCheckError('');
        })
        .catch((e: Error) => !cancelled && setCheckError(e.message));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [complete, sectionId, subjectId, facultyId, roomId, component, days, start, end, editing?.id]);

  const blocking = check ? Object.entries(check).filter(([, r]) => r.hasBlockingConflict) : [];
  const warnings = check
    ? Array.from(new Set(Object.values(check).flatMap((r) => r.nonBlockingConflicts.map((c) => c.message))))
    : [];

  const part = load.find((r) => String(r.subject_id) === subjectId && r.component === component);
  const subject = options.subjects.find((s) => String(s.id) === subjectId);

  function toggleDay(d: string) {
    setCheck(null);
    setDays((cur) => (isEdit ? [d] : cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        const r = await scheduleApi.update(editing!.id, {
          faculty_id: Number(facultyId),
          room_id: Number(roomId),
          component,
          day_of_week: days[0],
          start_time: start,
          end_time: end,
        });
        onSaved(r.warnings.length ? `Class updated, with a warning: ${r.warnings.join('; ')}` : 'Class updated. It is back in Draft for review.');
      } else {
        const r = await scheduleApi.createClass({
          section_id: Number(sectionId),
          subject_id: Number(subjectId),
          faculty_id: Number(facultyId),
          room_id: Number(roomId),
          component,
          days: BOARD_DAYS.filter((d) => days.includes(d)),
          start_time: start,
          end_time: end,
        });
        const what = `${r.ids.length} draft meeting${r.ids.length === 1 ? '' : 's'} added`;
        onSaved(r.warnings.length ? `${what}, with a warning: ${r.warnings.join('; ')}` : `${what}. Submit, approve and publish to show students.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-5" aria-labelledby="class-form-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="class-form-title" className="text-lg font-bold">
          {isEdit ? `Edit ${editing!.subject_code} ${editing!.component === 'LAB' ? 'lab' : 'lecture'}, ${editing!.section_code}` : 'Add a class'}
        </h2>
        <button type="button" onClick={onCancel} className="btn-ghost">Close</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="label-field">Section (set)</span>
          <select
            className="select-field"
            value={sectionId}
            disabled={isEdit}
            required
            onChange={(e) => {
              setSectionId(e.target.value);
              setSubjectId('');
              setFacultyId('');
              setCheck(null);
            }}
          >
            <option value="">Choose…</option>
            {options.sections.map((s) => (
              <option key={s.id} value={s.id}>{s.code}{s.adviser_name ? `, adviser ${s.adviser_name}` : ''}</option>
            ))}
          </select>
        </label>

        <div>
          <label className="block">
            <span className="label-field">Subject</span>
            <select
              className="select-field"
              value={subjectId}
              disabled={isEdit || !sectionId}
              required
              onChange={(e) => {
                setSubjectId(e.target.value);
                setFacultyId('');
                setCheck(null);
              }}
            >
              <option value="">{sectionId ? 'Choose…' : 'Choose a section first'}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.code}, {s.name}</option>
              ))}
            </select>
          </label>
          {!isEdit && (
            <label className="mt-1 flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={allSubjects} onChange={(e) => setAllSubjects(e.target.checked)} />
              Include subjects outside this set&apos;s curriculum
            </label>
          )}
        </div>

        <fieldset>
          <legend className="label-field">Part</legend>
          <div className="flex gap-2">
            {(['LEC', 'LAB'] as const).map((c) => (
              <label
                key={c}
                className={`flex min-h-[40px] flex-1 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-semibold ${
                  component === c ? 'border-lagoon bg-lagoon text-white' : 'border-line-strong bg-surface text-ink'
                }`}
              >
                <input
                  type="radio"
                  name="component"
                  value={c}
                  checked={component === c}
                  onChange={() => {
                    setComponent(c);
                    setCheck(null);
                  }}
                  className="sr-only"
                />
                {c === 'LEC' ? 'Lecture' : 'Laboratory'}
              </label>
            ))}
          </div>
          {subject && (
            <p className="hint">
              {subject.code}: {Number(subject.lec_hours ?? 0)} lecture and {Number(subject.lab_hours ?? 0)} lab hours a week
              {part && `. This set has ${part.scheduled_hours} of ${part.required_hours} ${component === 'LAB' ? 'lab' : 'lecture'} hours.`}
            </p>
          )}
        </fieldset>

        <div>
          <label className="block">
            <span className="label-field">Instructor</span>
            <select
              className="select-field"
              value={facultyId}
              disabled={!subjectId}
              required
              onChange={(e) => {
                setFacultyId(e.target.value);
                setCheck(null);
              }}
            >
              <option value="">{subjectId ? 'Choose…' : 'Choose a subject first'}</option>
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>{f.last_name}, {f.first_name}</option>
              ))}
            </select>
          </label>
          {subjectId && (
            <p className="hint">
              Only instructors assigned to this subject are listed. To add one, assign the subject to them in the Master List.
            </p>
          )}
        </div>

        <label className="block">
          <span className="label-field">Room</span>
          <select
            className="select-field"
            value={roomId}
            required
            onChange={(e) => {
              setRoomId(e.target.value);
              setCheck(null);
            }}
          >
            <option value="">Choose…</option>
            {rooms.map((r) => {
              const small = !!section && r.capacity < section.capacity;
              return (
                <option key={r.id} value={r.id} disabled={small}>
                  {r.code}, {r.room_type === 'LAB' ? 'laboratory' : 'lecture room'}, {r.capacity} seats{small ? ' (too small)' : ''}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr]">
        <fieldset>
          <legend className="label-field">{isEdit ? 'Day' : 'Days (tick every day it meets)'}</legend>
          <div className="flex flex-wrap gap-2">
            {BOARD_DAYS.map((d) => {
              const on = days.includes(d);
              return (
                <label
                  key={d}
                  className={`flex min-h-[40px] min-w-[3.25rem] cursor-pointer items-center justify-center rounded-md border px-2 text-sm font-semibold ${
                    on ? 'border-lagoon bg-lagoon text-white' : 'border-line-strong bg-surface text-ink'
                  }`}
                >
                  <input
                    type={isEdit ? 'radio' : 'checkbox'}
                    name="days"
                    checked={on}
                    onChange={() => toggleDay(d)}
                    className="sr-only"
                  />
                  <span aria-hidden="true">{(DAY_LABELS[d] ?? d).slice(0, 3)}</span>
                  <span className="sr-only">{DAY_LABELS[d]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="label-field">Starts</span>
          <input
            type="time"
            step={900}
            className="input-field"
            value={start}
            required
            onChange={(e) => {
              setStart(e.target.value);
              setCheck(null);
            }}
          />
        </label>

        <div>
          <label className="block">
            <span className="label-field">Length</span>
            <select
              className="select-field"
              value={String(length)}
              onChange={(e) => {
                setLength(e.target.value === 'custom' ? 'custom' : Number(e.target.value));
                setCheck(null);
              }}
            >
              {LENGTHS.map((m) => (
                <option key={m} value={m}>{lengthLabel(m)}</option>
              ))}
              <option value="custom">Other: set the end time</option>
            </select>
          </label>
          {length === 'custom' ? (
            <label className="mt-2 block">
              <span className="label-field">Ends</span>
              <input type="time" step={900} className="input-field" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} required />
            </label>
          ) : (
            start && <p className="hint">Ends at {to12h(end)}</p>
          )}
        </div>
      </div>

      <div aria-live="polite" className="space-y-2 text-sm">
        {end && start && end <= start && <p className="notice-error">The class must end after it starts.</p>}
        {checkError && <p className="notice-error">{checkError}</p>}
        {complete && check && blocking.length === 0 && (
          <p className="notice-success">
            No conflicts on {days.map((d) => DAY_LABELS[d]).join(', ')}, {to12h(start)} to {to12h(end)}.
          </p>
        )}
        {blocking.length > 0 && (
          <ul className="notice-error list-inside list-disc" role="alert">
            {blocking.map(([day, r]) =>
              r.blockingConflicts.map((c) => (
                <li key={`${day}-${c.kind}`}>
                  {DAY_LABELS[day]}: {c.message}
                  {c.detail ? ` (${c.detail})` : ''}
                </li>
              ))
            )}
          </ul>
        )}
        {warnings.length > 0 && (
          <ul className="notice-warning list-inside list-disc">
            {warnings.map((w) => (
              <li key={w}>Warning: {w}. You can still save.</li>
            ))}
          </ul>
        )}
        {error && <p className="notice-error" role="alert">{error}</p>}
      </div>

      {load.length > 0 && !isEdit && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-lagoon">Hours this set still needs</summary>
          <table className="data-table mt-2 max-w-xl">
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Part</th>
                <th scope="col">Scheduled / required</th>
              </tr>
            </thead>
            <tbody>
              {load.map((r) => (
                <tr key={`${r.subject_id}-${r.component}`}>
                  <td>{r.subject_code}</td>
                  <td>{r.component === 'LAB' ? 'Lab' : 'Lecture'}</td>
                  <td className={r.scheduled_hours >= r.required_hours ? 'text-seagrass' : 'text-ink'}>
                    {r.scheduled_hours} / {r.required_hours} h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={saving || !complete || blocking.length > 0}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : days.length > 1 ? `Add class on ${days.length} days` : 'Add class'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
