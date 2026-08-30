'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Schedule } from '@/lib/domain/types';
import { DAY_LABELS } from '@/lib/domain/constants';
import { Trash2 } from 'lucide-react';

interface TimeSlot {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface ScheduleBoardProps {
  schedules: Schedule[];
  timeSlots: TimeSlot[];
  sectionFilter: number | null;
  onMove: (scheduleId: number, timeSlotId: number) => Promise<void>;
  onDelete: (scheduleId: number) => Promise<void>;
  onRefresh: () => void;
}

export function ScheduleBoard({
  schedules,
  timeSlots,
  sectionFilter,
  onMove,
  onDelete,
  onRefresh,
}: ScheduleBoardProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const uniqueTimes = Array.from(new Set(timeSlots.map((t) => t.start_time))).sort();

  const filtered = sectionFilter
    ? schedules.filter((s) => s.section_id === sectionFilter)
    : schedules;

  const getSlotId = useCallback(
    (day: string, startTime: string) => {
      const slot = timeSlots.find((t) => t.day_of_week === day && t.start_time === startTime);
      return slot?.id;
    },
    [timeSlots]
  );

  const getScheduleAt = (day: string, startTime: string) =>
    filtered.find((s) => s.day_of_week === day && s.start_time === startTime);

  async function handleDrop(day: string, startTime: string) {
    if (!dragging) return;
    const slotId = getSlotId(day, startTime);
    if (!slotId) return;

    setMessage('');
    setError('');
    try {
      await onMove(dragging, slotId);
      setMessage('Schedule updated successfully');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Move failed');
    } finally {
      setDragging(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this schedule entry?')) return;
    setError('');
    try {
      await onDelete(id);
      setMessage('Schedule removed');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div>
      {message && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <p className="mb-4 text-sm text-slate-500">
        Drag blocks to reschedule, or click delete to remove. All changes validated by MOD-04.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-3 py-2 text-left">Time</th>
              {days.map((d) => (
                <th key={d} className="px-3 py-2 text-left">
                  {DAY_LABELS[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueTimes.map((time, idx) => (
              <tr key={time} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                <td className="border-t border-slate-200 px-3 py-2 font-medium text-slate-600">
                  {time}
                </td>
                {days.map((day) => {
                  const entry = getScheduleAt(day, time);
                  return (
                    <td
                      key={day}
                      className="min-h-[60px] border-t border-slate-200 px-2 py-2 align-top"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(day, time)}
                    >
                      {entry ? (
                        <div
                          draggable
                          onDragStart={() => setDragging(entry.id)}
                          className="group relative cursor-grab rounded-lg border border-primary/20 bg-primary/5 p-2 active:cursor-grabbing"
                        >
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="absolute right-1 top-1 hidden rounded p-0.5 text-red-500 hover:bg-red-50 group-hover:block"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <p className="text-xs font-semibold text-primary">{entry.subject_code}</p>
                          <p className="text-xs text-slate-600">{entry.section_code}</p>
                          <p className="text-xs text-slate-400">{entry.faculty_name}</p>
                          <p className="text-xs text-slate-400">{entry.room_code}</p>
                        </div>
                      ) : (
                        <div className="h-14 rounded border border-dashed border-slate-200" />
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

export function useScheduleBoardData(sectionId?: number | null) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const refresh = useCallback(async () => {
    const url = sectionId
      ? `/api/admin?resource=schedules&sectionId=${sectionId}`
      : '/api/admin?resource=schedules';
    const [schedRes, slotsRes] = await Promise.all([fetch(url), fetch('/api/admin?resource=time-slots')]);
    const schedData = await schedRes.json();
    const slotsData = await slotsRes.json();
    setSchedules(schedData);
    setTimeSlots(slotsData);
  }, [sectionId]);

  useEffect(() => {
    // Defer to a microtask so the initial setState calls don't run synchronously
    // inside the effect body (react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      refresh();
    });
  }, [refresh]);

  return { schedules, timeSlots, refresh };
}
