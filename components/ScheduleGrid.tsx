import { DAYS, DAY_LABELS } from '@/lib/domain/constants';
import type { Schedule } from '@/lib/domain/types';

interface ScheduleGridProps {
  schedules: Schedule[];
  emptyLabel?: string;
  showFaculty?: boolean;
  showSection?: boolean;
}

export function ScheduleGrid({
  schedules,
  emptyLabel = '—',
  showFaculty = false,
  showSection = false,
}: ScheduleGridProps) {
  const timeSlots = getUniqueTimeSlots(schedules);

  function getEntry(day: string, startTime: string) {
    return schedules.find((s) => s.day_of_week === day && s.start_time === startTime);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[800px] border-collapse text-sm">
        <thead>
          <tr className="bg-primary text-white">
            <th className="px-4 py-3 text-left font-medium">Time</th>
            {DAYS.map((day) => (
              <th key={day} className="px-4 py-3 text-left font-medium">
                {DAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot, idx) => (
            <tr key={slot} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
              <td className="whitespace-nowrap border-t border-slate-200 px-4 py-3 font-medium text-slate-600">
                {formatTimeLabel(slot, schedules)}
              </td>
              {DAYS.map((day) => {
                const entry = getEntry(day, slot);
                return (
                  <td
                    key={day}
                    className="border-t border-slate-200 px-4 py-3 align-top text-slate-700"
                  >
                    {entry ? (
                      <div className="space-y-0.5">
                        <p className="font-medium text-primary">
                          {entry.subject_code} — {entry.subject_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {entry.room_code} ({entry.room_name})
                        </p>
                        {showFaculty && entry.faculty_name && (
                          <p className="text-xs text-slate-400">{entry.faculty_name}</p>
                        )}
                        {showSection && entry.section_code && (
                          <p className="text-xs text-slate-400">{entry.section_code}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">{emptyLabel}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getUniqueTimeSlots(schedules: Schedule[]): string[] {
  const slots = new Set(schedules.map((s) => s.start_time!).filter(Boolean));
  if (slots.size === 0) {
    return ['07:30', '08:30', '09:30', '10:30', '11:30', '13:30', '14:30', '15:30'];
  }
  return Array.from(slots).sort();
}

function formatTimeLabel(startTime: string, schedules: Schedule[]): string {
  const match = schedules.find((s) => s.start_time === startTime);
  if (match?.end_time) return `${startTime} - ${match.end_time}`;
  return startTime;
}
