import Link from 'next/link';
import type { Schedule } from '@/lib/domain/types';
import { DAY_LABELS } from '@/lib/domain/constants';
import {
  daysOf,
  formatRange,
  rowsOf,
  sortByWeek,
  type Slot,
} from '@/lib/modules/mod-03-schedule-engine/public-timetable';

/** Whose timetable this is decides what each class block shows. */
export type TimetableMode = 'section' | 'faculty' | 'room';

interface Props {
  caption: string;
  entries: Schedule[];
  slots: Slot[];
  mode: TimetableMode;
  /** Campus "now", to highlight the current slot. */
  now?: { day: string; time: string };
}

const dayLabel = (d: string) => DAY_LABELS[d] ?? d;

function ClassDetails({ e, mode }: { e: Schedule; mode: TimetableMode }) {
  return (
    <>
      <p className="font-semibold text-cyber-cyan">{e.subject_code}</p>
      {mode !== 'faculty' && e.subject_name && <p className="text-slate-300">{e.subject_name}</p>}
      {mode !== 'section' && (
        <p className="text-slate-300">
          <Link href={`/schedules?section=${encodeURIComponent(e.section_code ?? '')}`} className="underline-offset-2 hover:underline">
            {e.section_code}
          </Link>
        </p>
      )}
      {mode !== 'faculty' && (
        <p className="text-slate-400">
          <Link href={`/schedules?faculty=${e.faculty_id}`} className="underline-offset-2 hover:underline">
            {e.faculty_name}
          </Link>
        </p>
      )}
      {mode !== 'room' && (
        <p className="text-slate-400">
          <Link href={`/rooms?room=${encodeURIComponent(e.room_code ?? '')}`} className="underline-offset-2 hover:underline">
            {e.room_code}
          </Link>
        </p>
      )}
    </>
  );
}

export function WeeklyTimetable({ caption, entries, slots, mode, now }: Props) {
  const days = daysOf(slots);
  const rows = rowsOf(slots);
  const at = (day: string, start: string) => entries.filter((e) => e.day_of_week === day && e.start_time === start);
  const isNow = (day: string, r: { start: string; end: string }) =>
    !!now && now.day === day && r.start <= now.time && now.time < r.end;

  return (
    <div>
      {/* Wide screens: weekly grid */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-700 md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Time</th>
              {days.map((d) => (
                <th key={d} scope="col" className={`px-3 py-2 font-semibold ${now?.day === d ? 'text-cyber-cyan' : ''}`}>
                  {dayLabel(d)}
                  {now?.day === d && <span className="sr-only"> (today)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.start} className="border-t border-slate-800">
                <th scope="row" className="whitespace-nowrap px-3 py-2 align-top font-medium text-slate-400">
                  {formatRange(r.start, r.end)}
                </th>
                {days.map((d) => {
                  const cell = at(d, r.start);
                  const current = isNow(d, r);
                  return (
                    <td
                      key={d}
                      className={`px-2 py-2 align-top ${current ? 'bg-cyber-teal/10 ring-1 ring-inset ring-cyber-teal/40' : ''}`}
                    >
                      {cell.length === 0 ? (
                        <span className={mode === 'room' ? 'text-emerald-400/80' : 'text-slate-700'}>
                          {mode === 'room' ? 'Free' : '—'}
                        </span>
                      ) : (
                        <div className="space-y-2">
                          {cell.map((e) => (
                            <div key={e.id} className="rounded-md border border-cyber-teal/20 bg-slate-900/70 p-2">
                              <ClassDetails e={e} mode={mode} />
                            </div>
                          ))}
                        </div>
                      )}
                      {current && <span className="sr-only">(now)</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one list per day */}
      <div className="space-y-4 md:hidden">
        {days.map((d) => {
          const list = sortByWeek(entries.filter((e) => e.day_of_week === d));
          return (
            <section key={d} aria-label={dayLabel(d)} className="rounded-xl border border-slate-700 p-3">
              <h3 className={`mb-2 text-sm font-semibold ${now?.day === d ? 'text-cyber-cyan' : 'text-slate-200'}`}>
                {dayLabel(d)} {now?.day === d && <span className="text-xs font-normal">(today)</span>}
              </h3>
              {list.length === 0 ? (
                <p className="text-xs text-slate-500">{mode === 'room' ? 'Free all day' : 'No classes'}</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {list.map((e) => (
                    <li key={e.id} className="flex gap-3 rounded-md bg-slate-900/70 p-2">
                      <span className="w-24 shrink-0 font-medium text-slate-400">
                        {formatRange(e.start_time ?? '', e.end_time ?? '')}
                      </span>
                      <div className="min-w-0">
                        <ClassDetails e={e} mode={mode} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
