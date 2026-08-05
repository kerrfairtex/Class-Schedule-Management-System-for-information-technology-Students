'use client';

import { useEffect, useState } from 'react';
import { scheduleApi, type ScheduleOptions } from '@/lib/api/client';
import type { ScheduleInput } from '@/lib/domain/types';
import { DAY_LABELS } from '@/lib/domain/constants';

interface ManualScheduleFormProps {
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function ManualScheduleForm({ onSuccess, onError }: ManualScheduleFormProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ScheduleOptions | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !options) {
      scheduleApi.getOptions().then(setOptions).catch((e) => onError(e.message));
    }
  }, [open, options, onError]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!options?.semester) {
      onError('No active semester');
      return;
    }
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const data: ScheduleInput = {
      section_id: Number(form.get('section_id')),
      subject_id: Number(form.get('subject_id')),
      faculty_id: Number(form.get('faculty_id')),
      room_id: Number(form.get('room_id')),
      time_slot_id: Number(form.get('time_slot_id')),
      semester_id: options.semester.id,
    };

    try {
      await scheduleApi.create(data);
      onSuccess();
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        Add Schedule Manually
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="flex items-center justify-between sm:col-span-2 lg:col-span-3">
        <h3 className="font-semibold">Manual Schedule Entry (MOD-05)</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500">
          Close
        </button>
      </div>

      <SelectField name="section_id" label="Section" options={options?.sections.map((s) => ({ value: s.id, label: s.code })) || []} />
      <SelectField name="subject_id" label="Subject" options={options?.subjects.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` })) || []} />
      <SelectField name="faculty_id" label="Faculty" options={options?.faculty.map((f) => ({ value: f.id, label: `${f.employee_id} — ${f.first_name} ${f.last_name}` })) || []} />
      <SelectField name="room_id" label="Room" options={options?.rooms.map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` })) || []} />
      <SelectField
        name="time_slot_id"
        label="Time Slot"
        options={
          options?.timeSlots.map((t) => ({
            value: t.id,
            label: `${DAY_LABELS[t.day_of_week]} ${t.start_time}–${t.end_time}`,
          })) || []
        }
      />

      <button type="submit" disabled={loading} className="btn-primary sm:col-span-2 lg:col-span-3">
        {loading ? 'Saving...' : 'Create Schedule'}
      </button>
    </form>
  );
}

function SelectField({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: number; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select name={name} required className="input-field">
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
