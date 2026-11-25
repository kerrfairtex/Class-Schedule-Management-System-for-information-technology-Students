import Link from 'next/link';
import type { Schedule } from '@/lib/domain/types';
import { DAY_LABELS } from '@/lib/domain/constants';
import { TimeGrid } from '@/components/TimeGrid';
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
      <p className="font-bold text-ink">
        {e.subject_code}{' '}
        <span className={`rounded px-1 text-[10px] font-semibold ${e.component === 'LAB' ? 'bg-seagrass text-white' : 'bg-lagoon text-white'}`}>
          {e.component === 'LAB' ? 'LAB' : 'LEC'}
        </span>
      </p>
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
  // Days with standard periods, plus any day a class meets outside them.
  const days = daysOf([...slots, ...entries.map((e) => ({ day_of_week: e.day_of_week ?? '' }))].filter((d) => d.day_of_week));
  const rows = rowsOf(slots);
  const bounds = rows.length ? { start: rows[0].start, end: rows.reduce((m, r) => (r.end > m ? r.end : m), rows[0].end) } : undefined;
  const isNow = (day: string, start: string, end: string) =>
    !!now && now.day === day && start <= now.time && now.time < end;

  return (
    <div>
      {/* Wide screens: real time axis, so 2-hour and 3-hour classes show their length */}
      <div className="hidden md:block">
        <TimeGrid
          caption={caption}
          days={days}
          entries={entries}
          bounds={bounds}
          now={now}
          renderBlock={(e) => (
            <div className="h-full border-l-4 border-lagoon p-1.5">
              <ClassDetails e={e} mode={mode} />
            </div>
          )}
          blockClassName={(e) => (e.component === 'LAB' ? 'border-seagrass/40 bg-seagrass-50' : 'border-lagoon/30 bg-lagoon-50')}
        />
        {mode === 'room' && <p className="mt-2 text-xs text-muted">Times with no class are free.</p>}
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
