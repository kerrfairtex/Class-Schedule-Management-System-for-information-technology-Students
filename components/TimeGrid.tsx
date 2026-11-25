import type { DragEvent, ReactNode } from 'react';
import { DAY_LABELS } from '@/lib/domain/constants';

/**
 * A week laid out on a real time axis: each class is placed at its start
 * time and is as tall as it is long, so a 2-hour lecture and a 3-hour lab
 * read correctly. Overlapping classes (e.g. different sections at once in
 * the "All sections" view) sit side by side.
 *
 * No hooks: renders on the server for public pages and on the client for the
 * schedule board, which also passes `onDropAt` for drag-and-drop moves.
 */

export interface GridEntry {
  id: number;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
}

const PX_PER_MIN = 1.1;
const SNAP_MIN = 15;

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const toHHMM = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`;

/** Lane index and lane count per entry, so overlapping classes share width. */
function layout<T extends GridEntry>(entries: T[]): Map<number, { lane: number; lanes: number }> {
  const sorted = [...entries].sort((a, b) => toMin(a.start_time!) - toMin(b.start_time!));
  const out = new Map<number, { lane: number; lanes: number }>();
  let cluster: T[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const e of cluster) out.set(e.id, { ...out.get(e.id)!, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
  };
  for (const e of sorted) {
    const start = toMin(e.start_time!);
    const end = toMin(e.end_time!);
    if (start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else laneEnds[lane] = end;
    out.set(e.id, { lane, lanes: 1 });
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return out;
}

export function TimeGrid<T extends GridEntry>({
  caption,
  days,
  entries,
  bounds,
  now,
  renderBlock,
  blockClassName,
  onDropAt,
  minWidth = 760,
}: {
  caption: string;
  days: string[];
  entries: T[];
  /** Earliest and latest times to show (e.g. the standard periods). */
  bounds?: { start: string; end: string };
  now?: { day: string; time: string };
  renderBlock: (entry: T) => ReactNode;
  blockClassName?: (entry: T) => string;
  /** Board only: a dragged class was dropped on `day` at `start` (snapped). */
  onDropAt?: (day: string, start: string, e: DragEvent<HTMLElement>) => void;
  minWidth?: number;
}) {
  const timed = entries.filter((e) => e.day_of_week && e.start_time && e.end_time);
  const starts = [...timed.map((e) => toMin(e.start_time!)), ...(bounds ? [toMin(bounds.start)] : [])];
  const ends = [...timed.map((e) => toMin(e.end_time!)), ...(bounds ? [toMin(bounds.end)] : [])];
  const first = Math.floor((starts.length ? Math.min(...starts) : 7 * 60) / 60) * 60;
  const last = Math.ceil((ends.length ? Math.max(...ends) : 17 * 60) / 60) * 60;
  const height = (last - first) * PX_PER_MIN;
  const hours = Array.from({ length: (last - first) / 60 + 1 }, (_, i) => first / 60 + i);
  const nowMin = now ? toMin(now.time) : -1;

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface" role="group" aria-label={caption}>
      <div style={{ minWidth }}>
        <div className="grid border-b border-line-strong bg-paper-2" style={{ gridTemplateColumns: `4.5rem repeat(${days.length}, 1fr)` }}>
          <div className="px-2 py-2 text-xs font-semibold text-ink-soft">Time</div>
          {days.map((d) => (
            <div
              key={d}
              className={`px-2 py-2 text-xs font-semibold ${now?.day === d ? 'border-b-2 border-sand-dark text-ink' : 'text-ink-soft'}`}
            >
              {DAY_LABELS[d] ?? d}
              {now?.day === d && <span className="ml-1 font-normal text-muted">today</span>}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: `4.5rem repeat(${days.length}, 1fr)` }}>
          <div className="relative border-r border-line" style={{ height }} aria-hidden="true">
            {hours.map((h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-muted"
                style={{ top: (h * 60 - first) * PX_PER_MIN }}
              >
                {h * 60 < last ? hourLabel(h) : ''}
              </span>
            ))}
          </div>

          {days.map((d) => {
            const dayEntries = timed.filter((e) => e.day_of_week === d);
            const lanes = layout(dayEntries);
            const showNow = now?.day === d && nowMin >= first && nowMin < last;
            return (
              <div
                key={d}
                className="relative border-r border-line last:border-r-0"
                style={{
                  height,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${60 * PX_PER_MIN - 1}px, var(--grid-line, #E2EAE7) ${60 * PX_PER_MIN - 1}px, var(--grid-line, #E2EAE7) ${60 * PX_PER_MIN}px)`,
                  backgroundPositionY: `${((60 - (first % 60)) % 60) * PX_PER_MIN}px`,
                }}
                onDragOver={onDropAt ? (e) => e.preventDefault() : undefined}
                onDrop={
                  onDropAt
                    ? (e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const mins = first + (e.clientY - rect.top) / PX_PER_MIN;
                        const snapped = Math.max(first, Math.round(mins / SNAP_MIN) * SNAP_MIN);
                        onDropAt(d, toHHMM(snapped), e);
                      }
                    : undefined
                }
              >
                {showNow && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-sand-dark"
                    style={{ top: (nowMin - first) * PX_PER_MIN }}
                    aria-hidden="true"
                  />
                )}
                <ul aria-label={DAY_LABELS[d] ?? d}>
                  {dayEntries
                    .sort((a, b) => toMin(a.start_time!) - toMin(b.start_time!))
                    .map((e) => {
                      const { lane, lanes: count } = lanes.get(e.id)!;
                      const top = (toMin(e.start_time!) - first) * PX_PER_MIN;
                      const h = (toMin(e.end_time!) - toMin(e.start_time!)) * PX_PER_MIN;
                      const current = now?.day === d && toMin(e.start_time!) <= nowMin && nowMin < toMin(e.end_time!);
                      return (
                        <li
                          key={e.id}
                          className={`absolute overflow-hidden rounded-md border text-xs ${current ? 'now-band border-sand-dark' : ''} ${blockClassName?.(e) ?? 'border-lagoon/30 bg-lagoon-50'}`}
                          style={{
                            top: top + 1,
                            height: Math.max(h - 2, 18),
                            left: `calc(${(lane / count) * 100}% + 2px)`,
                            width: `calc(${100 / count}% - 4px)`,
                          }}
                        >
                          {renderBlock(e)}
                        </li>
                      );
                    })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
