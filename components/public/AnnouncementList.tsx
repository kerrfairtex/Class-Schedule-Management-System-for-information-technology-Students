import type { Announcement } from '@/lib/modules/mod-10-announcements/service';
import { formatCampusDate } from '@/lib/modules/mod-03-schedule-engine/public-timetable';

/** Announcements as plain text (never HTML), pinned ones marked. */
export function AnnouncementList({ items, empty }: { items: Announcement[]; empty: string }) {
  if (items.length === 0) return <p className="mt-4 text-muted">{empty}</p>;
  return (
    <ul className="mt-4 divide-y divide-line border-y border-line">
      {items.map((a) => (
        <li key={a.id} className="py-4">
          <article>
            <h3 className="text-lg font-bold">
              {a.title}
              {a.pinned === 1 && (
                <span className="ml-2 rounded bg-sand px-1.5 py-0.5 align-middle text-xs font-semibold text-ink">
                  Pinned
                </span>
              )}
            </h3>
            <p className="text-sm text-muted">
              <time dateTime={a.starts_on}>{formatCampusDate(a.starts_on, { weekday: false })}</time>
            </p>
            <p className="mt-2 max-w-prose whitespace-pre-line text-ink-soft">{a.body}</p>
          </article>
        </li>
      ))}
    </ul>
  );
}
