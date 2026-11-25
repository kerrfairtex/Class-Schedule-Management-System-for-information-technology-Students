'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Schedule, ScheduleStatus } from '@/lib/domain/types';
import { DAY_LABELS, WEEK_ORDER } from '@/lib/domain/constants';
import { TimeGrid } from '@/components/TimeGrid';
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
  DRAFT: 'bg-paper-2 text-ink-soft border-line',
  PENDING_REVIEW: 'bg-sand text-ink border-sand-dark/50',
  APPROVED: 'bg-lagoon-50 text-lagoon-dark border-lagoon/40',
  PUBLISHED: 'bg-seagrass-50 text-seagrass border-seagrass/40',
  CANCELLED: 'bg-coral-50 text-coral border-coral/40',
  ARCHIVED: 'bg-paper-2 text-muted border-line',
};

interface ScheduleBoardProps {
  schedules: Schedule[];
  timeSlots: TimeSlot[];
  loading: boolean;
  loadError: string;
  /** Show the section code on each block (the "All sections" view). */
  showSection: boolean;
  onMoveTo: (scheduleId: number, day: string, start: string) => Promise<void>;
  onDelete: (scheduleId: number) => Promise<void>;
  onTransition: (scheduleId: number, toStatus: ScheduleStatus) => Promise<void>;
  onEdit: (entry: Schedule) => void;
  onRefresh: () => void;
}

const statusOf = (s: Schedule): ScheduleStatus => s.status ?? 'DRAFT';
const isEditable = (s: Schedule) => EDITABLE_STATUSES.includes(statusOf(s));
const to12h = (hhmm = '') => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
};

/**
 * The admin weekly board. Classes sit on a real time axis (any length);
 * drag one to another day or time to move it, keeping its length. Select a
 * class to edit it, change its status or delete it: the keyboard and touch
 * path for everything drag-and-drop does.
 */
export function ScheduleBoard({
  schedules,
  timeSlots,
  loading,
  loadError,
  showSection,
  onMoveTo,
  onDelete,
  onTransition,
  onEdit,
  onRefresh,
}: ScheduleBoardProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const visible = schedules.filter((s) => statusOf(s) !== 'ARCHIVED');
  const days = WEEK_ORDER.filter(
    (d) => d !== 'sunday' && (timeSlots.some((t) => t.day_of_week === d) || visible.some((s) => s.day_of_week === d))
  );
  const bounds = timeSlots.length
    ? {
        start: timeSlots.reduce((m, t) => (t.start_time < m ? t.start_time : m), timeSlots[0].start_time),
        end: timeSlots.reduce((m, t) => (t.end_time > m ? t.end_time : m), timeSlots[0].end_time),
      }
    : undefined;
  const selected = visible.find((s) => s.id === selectedId) ?? null;

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

  function drop(day: string, start: string, e: React.DragEvent<HTMLElement>) {
    const id = Number(e.dataTransfer.getData('text/plain'));
    const entry = visible.find((s) => s.id === id);
    if (!entry || !isEditable(entry)) return;
    if (entry.day_of_week === day && entry.start_time === start) return;
    return run(
      () => onMoveTo(id, day, start),
      `${entry.subject_code} moved to ${DAY_LABELS[day]} ${to12h(start)}. It is back in Draft for review.`
    );
  }

  if (loading) {
    return (
      <div role="status" className="card text-center text-sm text-muted">
        Loading the schedule board…
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="notice-error">
        <p className="mb-3">Could not load schedules: {loadError}</p>
        <button type="button" onClick={onRefresh} className="btn-secondary">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div aria-live="polite">
        {message && <div className="notice-success mb-4">{message}</div>}
        {error && (
          <div role="alert" className="notice-error mb-4">
            {error}
          </div>
        )}
      </div>
      <p className="mb-3 text-sm text-muted">
        Drag a class to another day or time (it keeps its length), or select it to edit, change its status or delete
        it. Every change is checked for conflicts. Only published classes appear to students.
      </p>
      {visible.length === 0 && (
        <p className="notice-info mb-4">
          No classes yet. Use <strong>Add a class</strong>, or auto-generate drafts for a set.
        </p>
      )}

      <TimeGrid
        caption="Weekly schedule board"
        days={days}
        entries={visible}
        bounds={bounds}
        minWidth={showSection ? 980 : 820}
        onDropAt={drop}
        blockClassName={(e) =>
          `${statusOf(e) === 'CANCELLED' ? 'border-coral/40 bg-coral-50 opacity-70' : e.component === 'LAB' ? 'border-seagrass/40 bg-seagrass-50' : 'border-lagoon/30 bg-lagoon-50'} ${
            e.id === selectedId ? 'ring-2 ring-lagoon' : ''
          }`
        }
        renderBlock={(e) => (
          <button
            type="button"
            draggable={isEditable(e) && !busy}
            onDragStart={(ev) => ev.dataTransfer.setData('text/plain', String(e.id))}
            onClick={() => setSelectedId(e.id === selectedId ? null : e.id)}
            aria-pressed={e.id === selectedId}
            className={`block h-full w-full p-1.5 text-left ${isEditable(e) ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <span className="flex items-start justify-between gap-1">
              <span className="font-bold text-ink">
                {e.subject_code} <span className="font-semibold text-ink-soft">{e.component === 'LAB' ? 'Lab' : 'Lec'}</span>
              </span>
              <span className={`shrink-0 rounded border px-1 text-[10px] font-semibold leading-tight ${STATUS_BADGE[statusOf(e)]}`}>
                {STATUS_LABEL[statusOf(e)]}
              </span>
            </span>
            <span className="block text-ink-soft">
              {showSection && <>{e.section_code}, </>}
              {e.room_code}
            </span>
            <span className="block truncate text-muted">{e.faculty_name}</span>
            <span className="block text-muted">
              {to12h(e.start_time)}–{to12h(e.end_time)}
            </span>
          </button>
        )}
      />

      {selected && (
        <section aria-labelledby="selected-heading" className="card mt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="selected-heading" className="text-lg font-bold">
                {selected.subject_code} {selected.component === 'LAB' ? 'laboratory' : 'lecture'}, {selected.section_code}
              </h3>
              <p className="text-sm text-ink-soft">
                {DAY_LABELS[selected.day_of_week ?? '']} {to12h(selected.start_time)}–{to12h(selected.end_time)}, {selected.room_code},{' '}
                {selected.faculty_name}.{' '}
                <span className={`rounded border px-1.5 text-xs font-semibold ${STATUS_BADGE[statusOf(selected)]}`}>
                  {STATUS_LABEL[statusOf(selected)]}
                </span>
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => setSelectedId(null)}>
              Close
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {isEditable(selected) && (
              <button type="button" className="btn-primary" disabled={busy} onClick={() => onEdit(selected)}>
                Edit day, time, room or instructor
              </button>
            )}
            {ALLOWED_TRANSITIONS[statusOf(selected)].map((to) => (
              <button
                key={to}
                type="button"
                disabled={busy}
                className="btn-secondary"
                onClick={() => {
                  if (to === 'CANCELLED' && !confirm('Cancel this published class? Students will no longer see it.')) return;
                  run(() => onTransition(selected.id, to), `${selected.subject_code}, ${selected.section_code}: ${STATUS_LABEL[to]}`);
                }}
              >
                {TRANSITION_VERB[to]}
              </button>
            ))}
            {isEditable(selected) && (
              <button
                type="button"
                disabled={busy}
                className="btn-danger"
                onClick={() => {
                  if (!confirm('Delete this class meeting? This cannot be undone.')) return;
                  setSelectedId(null);
                  run(() => onDelete(selected.id), 'Class meeting deleted');
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
              </button>
            )}
          </div>
          {!isEditable(selected) && statusOf(selected) === 'PUBLISHED' && (
            <p className="hint mt-2">Published classes are locked. Cancel this one, then add a replacement.</p>
          )}
        </section>
      )}
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
