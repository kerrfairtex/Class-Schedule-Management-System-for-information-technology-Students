import { DAYS, DAY_LABELS, TIME_SLOTS } from '@/lib/constants';
import type { TimetableSlot } from '@/lib/types';

interface TimetableGridProps {
  entries: TimetableSlot[];
  emptyLabel?: string;
}

export function TimetableGrid({ entries, emptyLabel = '—' }: TimetableGridProps) {
  function getEntry(day: string, time: string) {
    return entries.find((e) => e.day === day && e.time === time);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[700px] border-collapse text-sm">
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
          {TIME_SLOTS.map((slot, idx) => (
            <tr key={slot.value} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
              <td className="whitespace-nowrap border-t border-slate-200 px-4 py-3 font-medium text-slate-600">
                {slot.label}
              </td>
              {DAYS.map((day) => {
                const entry = getEntry(day, slot.value);
                return (
                  <td
                    key={day}
                    className="border-t border-slate-200 px-4 py-3 align-top text-slate-700"
                  >
                    {entry ? (
                      <div className="space-y-0.5">
                        <p className="font-medium text-primary">{entry.subject}</p>
                        <p className="text-xs text-slate-500">Room: {entry.room}</p>
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

interface StudentTimetableGridProps {
  entries: (TimetableSlot & { faculty_username?: string })[];
}

export function StudentTimetableGrid({ entries }: StudentTimetableGridProps) {
  function getEntry(day: string, time: string) {
    return entries.find((e) => e.day === day && e.time === time);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[700px] border-collapse text-sm">
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
          {TIME_SLOTS.map((slot, idx) => (
            <tr key={slot.value} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
              <td className="whitespace-nowrap border-t border-slate-200 px-4 py-3 font-medium text-slate-600">
                {slot.label}
              </td>
              {DAYS.map((day) => {
                const entry = getEntry(day, slot.value);
                return (
                  <td
                    key={day}
                    className="border-t border-slate-200 px-4 py-3 align-top text-slate-700"
                  >
                    {entry ? (
                      <div className="space-y-0.5">
                        <p className="font-medium text-primary">{entry.subject}</p>
                        <p className="text-xs text-slate-500">Room: {entry.room}</p>
                        {entry.faculty_username && (
                          <p className="text-xs text-slate-400">Faculty: {entry.faculty_username}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
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
