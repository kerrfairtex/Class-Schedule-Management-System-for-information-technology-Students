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
  /** Campus "now", to mark today and the current period. */
  now?: { day: string; time: string };
}

const dayLabel = (d: string) => DAY_LABELS[d] ?? d;

function ClassDetails({ e, mode }: { e: Schedule; mode: TimetableMode }) {
  return (
    <>
      <p className="font-bold text-ink">{e.subject_code}</p>
      {mode !== 'faculty' && e.subject_name && <p className="text-ink-soft">{e.subject_name}</p>}
      <p className="mt-0.5 text-muted">
        {[
          mode !== 'section' && (
            <Link key="s" href={`/schedules?section=${encodeURIComponent(e.section_code ?? '')}`} className="hover:text-lagoon hover:underline">
              {e.section_code}
            </Link>
          ),
          mode !== 'room' && (
            <Link key="r" href={`/rooms?room=${encodeURIComponent(e.room_code ?? '')}`} className="hover:text-lagoon hover:underline">
              {e.room_code}
            </Link>
          ),
          mode !== 'faculty' && (
            <Link key="f" href={`/schedules?faculty=${e.faculty_id}`} className="hover:text-lagoon hover:underline">
              {e.faculty_name}
            </Link>
          ),
        ]
          .filter(Boolean)
          .flatMap((node, i) => (i === 0 ? [node] : [<span key={`sep${i}`}>, </span>, node]))}
      </p>
    </>
  );
}

export function WeeklyTimetable({ caption, entries, slots, mode, now }: Props) {
  const days = daysOf(slots);
  const rows = rowsOf(slots);
  const at = (day: string, start: string) => entries.filter((e) => e.day_of_week === day && e.start_time === start);
  const isNow = (day: string, start: string, end: string) =>
    !!now && now.day === day && start <= now.time && now.time < end;

  return (
    <div>
      {/* Wide screens: weekly grid */}
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface md:block">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-paper-2">
              <th scope="col" className="w-28 px-3 py-2 font-semibold text-ink-soft">Time</th>
              {days.map((d) => (
                <th
                  key={d}
                  scope="col"
                  className={`px-3 py-2 font-semibold ${now?.day === d ? 'border-b-2 border-sand-dark text-ink' : 'text-ink-soft'}`}
                >
                  {dayLabel(d)}
                  {now?.day === d && <span className="ml-1 font-normal text-muted">today</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.start} className="border-t border-line">
                <th scope="row" className="whitespace-nowrap px-3 py-2 align-top font-medium text-muted">
                  {formatRange(r.start, r.end)}
                </th>
                {days.map((d) => {
                  const cell = at(d, r.start);
                  const current = isNow(d, r.start, r.end);
                  return (
                    <td key={d} className={`px-2 py-2 align-top ${current ? 'now-band' : ''}`}>
                      {cell.length === 0 ? (
                        <span className={mode === 'room' ? 'text-seagrass' : 'text-line-strong'}>
                          {mode === 'room' ? 'Free' : <span aria-label="No class">–</span>}
                        </span>
                      ) : (
                        <div className="space-y-2">
                          {cell.map((e) => (
                            <div key={e.id} className="rounded-r-md border-l-4 border-lagoon bg-lagoon-50/60 p-2">
                              <ClassDetails e={e} mode={mode} />
                            </div>
                          ))}
                        </div>
                      )}
                      {current && <span className="sr-only"> (now)</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one list per day, today first */}
      <div className="space-y-4 md:hidden">
        {[...days]
          .sort((a, b) => (a === now?.day ? -1 : b === now?.day ? 1 : 0))
          .map((d) => {
            const list = sortByWeek(entries.filter((e) => e.day_of_week === d));
            return (
              <section key={d} aria-label={dayLabel(d)} className="rounded-lg border border-line bg-surface">
                <h3 className={`px-4 py-2 text-sm font-bold ${now?.day === d ? 'border-b-2 border-sand-dark' : 'border-b border-line'}`}>
                  {dayLabel(d)} {now?.day === d && <span className="font-normal text-muted">today</span>}
                </h3>
                {list.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted">{mode === 'room' ? 'Free all day' : 'No classes'}</p>
                ) : (
                  <ul className="divide-y divide-line text-sm">
                    {list.map((e) => {
                      const current = isNow(d, e.start_time ?? '', e.end_time ?? '');
                      return (
                        <li key={e.id} className={`flex gap-3 px-4 py-3 ${current ? 'now-band' : ''}`}>
                          <time className="w-[5.5rem] shrink-0 font-semibold text-ink-soft">
                            {formatRange(e.start_time ?? '', e.end_time ?? '').replace('–', '–​')}
                          </time>
                          <div className="min-w-0">
                            <ClassDetails e={e} mode={mode} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
      </div>
    </div>
  );
}
