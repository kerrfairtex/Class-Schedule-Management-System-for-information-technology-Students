'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Schedule, ScheduleStatus } from '@/lib/domain/types';
import { DAY_LABELS, WEEK_ORDER } from '@/lib/domain/constants';
import {
  ALLOWED_TRANSITIONS,
  EDITABLE_STATUSES,
  STATUS_LABEL,
  TRANSITION_VERB,
} from '@/lib/domain/schedule-status';
import { Trash2 } from 'lucide-react';

export interface TimeSlot {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export const STATUS_BADGE: Record<ScheduleStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-300',
  PENDING_REVIEW: 'bg-amber-50 text-amber-800 border-amber-300',
  APPROVED: 'bg-blue-50 text-blue-800 border-blue-300',
  PUBLISHED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  CANCELLED: 'bg-red-50 text-red-800 border-red-300',
  ARCHIVED: 'bg-slate-50 text-slate-500 border-slate-200',
};

interface ScheduleBoardProps {
  schedules: Schedule[];
  timeSlots: TimeSlot[];
  loading: boolean;
  loadError: string;
  onMove: (scheduleId: number, timeSlotId: number) => Promise<void>;
  onDelete: (scheduleId: number) => Promise<void>;
  onTransition: (scheduleId: number, toStatus: ScheduleStatus) => Promise<void>;
  onRefresh: () => void;
}

const statusOf = (s: Schedule): ScheduleStatus => s.status ?? 'DRAFT';
const isEditable = (s: Schedule) => EDITABLE_STATUSES.includes(statusOf(s));

export function ScheduleBoard({
  schedules,
  timeSlots,
  loading,
  loadError,
  onMove,
  onDelete,
  onTransition,
  onRefresh,
}: ScheduleBoardProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Show every day that has slots (Saturday classes included), in week order.
  const days = WEEK_ORDER.filter((d) => timeSlots.some((t) => t.day_of_week === d));
  const uniqueTimes = Array.from(new Set(timeSlots.map((t) => t.start_time))).sort();
  // Archived rows are history, not part of the timetable.
  const visible = schedules.filter((s) => statusOf(s) !== 'ARCHIVED');

  const getSlotId = useCallback(
    (day: string, startTime: string) =>
      timeSlots.find((t) => t.day_of_week === day && t.start_time === startTime)?.id,
    [timeSlots]
  );

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await action();
      setMessage(success);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  function move(scheduleId: number, timeSlotId: number) {
    return run(() => onMove(scheduleId, timeSlotId), 'Class moved. It is back in Draft for review.');
  }

  async function handleDrop(day: string, startTime: string) {
    const id = dragging;
    setDragging(null);
    const slotId = getSlotId(day, startTime);
    if (id && slotId) await move(id, slotId);
  }

  function remove(id: number) {
    if (!confirm('Delete this class? This cannot be undone.')) return;
    return run(() => onDelete(id), 'Class deleted');
  }

  function transition(s: Schedule, to: ScheduleStatus) {
    if (to === 'CANCELLED' && !confirm('Cancel this published class? Students will no longer see it.')) return;
    return run(() => onTransition(s.id, to), `${s.subject_code} · ${s.section_code}: ${STATUS_LABEL[to]}`);
  }

  if (loading) {
    return (
      <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading schedule board…
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="mb-3">Could not load schedules: {loadError}</p>
        <button type="button" onClick={onRefresh} className="btn-secondary text-sm">
          Try again
        </button>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        No time slots are defined yet, so there is nothing to schedule into. Add time slots first.
      </div>
    );
  }

  return (
    <div>
      <div aria-live="polite">
        {message && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
        )}
        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Drag a class to another slot, or open <strong>Actions</strong> on a class to move it, change its
        status or delete it. Every change is checked for conflicts. Only <strong>Published</strong> classes
        appear to students and on the public site.
      </p>
      {visible.length === 0 && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No classes scheduled yet. Use <strong>Add Schedule Manually</strong> or auto-generate a section.
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm" aria-busy={busy}>
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <caption className="sr-only">Weekly class schedule</caption>
          <thead>
            <tr className="bg-primary text-white">
              <th scope="col" className="px-3 py-2 text-left">Time</th>
              {days.map((d) => (
                <th key={d} scope="col" className="px-3 py-2 text-left">
                  {DAY_LABELS[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueTimes.map((time, idx) => (
              <tr key={time} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                <th scope="row" className="border-t border-slate-200 px-3 py-2 text-left font-medium text-slate-600">
                  {time}
                </th>
                {days.map((day) => {
                  const entries = visible.filter((s) => s.day_of_week === day && s.start_time === time);
                  const slotExists = getSlotId(day, time) !== undefined;
                  return (
                    <td
                      key={day}
                      className="border-t border-slate-200 px-2 py-2 align-top"
                      onDragOver={(e) => slotExists && e.preventDefault()}
                      onDrop={() => handleDrop(day, time)}
                    >
                      {entries.length === 0 ? (
                        <div className="h-14 rounded border border-dashed border-slate-200" />
                      ) : (
                        <div className="space-y-2">
                          {entries.map((entry) => (
                            <ScheduleCard
                              key={entry.id}
                              entry={entry}
                              timeSlots={timeSlots}
                              disabled={busy}
                              onDragStart={() => setDragging(entry.id)}
                              onMove={(slotId) => move(entry.id, slotId)}
                              onTransition={(to) => transition(entry, to)}
                              onDelete={() => remove(entry.id)}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScheduleCard({
  entry,
  timeSlots,
  disabled,
  onDragStart,
  onMove,
  onTransition,
  onDelete,
}: {
  entry: Schedule;
  timeSlots: TimeSlot[];
  disabled: boolean;
  onDragStart: () => void;
  onMove: (timeSlotId: number) => void;
  onTransition: (to: ScheduleStatus) => void;
  onDelete: () => void;
}) {
  const status = statusOf(entry);
  const editable = isEditable(entry);
  const next = ALLOWED_TRANSITIONS[status];
  const label = `${entry.subject_code} ${entry.section_code}`;

  return (
    <div
      draggable={editable && !disabled}
      onDragStart={onDragStart}
      className={`rounded-lg border p-2 ${
        status === 'CANCELLED' ? 'border-red-200 bg-red-50/50 opacity-70' : 'border-primary/20 bg-primary/5'
      } ${editable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="mb-1 flex items-start justify-between gap-1">
        <p className="text-xs font-semibold text-primary">{entry.subject_code}</p>
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none ${STATUS_BADGE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="text-xs text-slate-700">{entry.section_code}</p>
      <p className="text-xs text-slate-500">{entry.faculty_name}</p>
      <p className="text-xs text-slate-500">{entry.room_code}</p>

      <details className="mt-1 text-xs">
        <summary className="cursor-pointer select-none rounded py-1 text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          Actions
        </summary>
        <div className="mt-1 space-y-1.5">
          {editable && (
            <label className="block">
              <span className="sr-only">Move {label} to</span>
              <select
                className="w-full rounded border border-slate-300 bg-white px-1 py-1 text-xs"
                value=""
                disabled={disabled}
                onChange={(e) => e.target.value && onMove(Number(e.target.value))}
              >
                <option value="">Move to…</option>
                {timeSlots
                  .filter((t) => t.id !== entry.time_slot_id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {DAY_LABELS[t.day_of_week] ?? t.day_of_week} {t.start_time}–{t.end_time}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {next.map((to) => (
            <button
              key={to}
              type="button"
              disabled={disabled}
              onClick={() => onTransition(to)}
              aria-label={`${TRANSITION_VERB[to]}: ${label}`}
              className="block w-full rounded border border-slate-300 bg-white px-2 py-1 text-left hover:bg-slate-50 disabled:opacity-50"
            >
              {TRANSITION_VERB[to]}
            </button>
          ))}
          {editable && (
            <button
              type="button"
              disabled={disabled}
              onClick={onDelete}
              aria-label={`Delete ${label}`}
              className="flex w-full items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-left text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" /> Delete
            </button>
          )}
        </div>
      </details>
    </div>
  );
}

export function useScheduleBoardData(sectionId?: number | null) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    const url = sectionId
      ? `/api/admin?resource=schedules&sectionId=${sectionId}`
      : '/api/admin?resource=schedules';
    try {
      const [schedRes, slotsRes] = await Promise.all([fetch(url), fetch('/api/admin?resource=time-slots')]);
      const [schedData, slotsData] = await Promise.all([schedRes.json(), slotsRes.json()]);
      if (!schedRes.ok || !slotsRes.ok) {
        throw new Error(schedData.error || slotsData.error || 'Request failed');
      }
      setSchedules(schedData);
      setTimeSlots(slotsData);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    // Defer to a microtask so the initial setState calls don't run synchronously
    // inside the effect body (react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      refresh();
    });
  }, [refresh]);

  return { schedules, timeSlots, loading, loadError, refresh };
}
