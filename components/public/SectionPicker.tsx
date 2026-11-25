import Link from 'next/link';

interface Section {
  id: number;
  code: string;
  year_level: number;
}

/** Section buttons grouped by year level; each opens that section's timetable. */
export function SectionPicker({
  sections,
  counts,
  selectedId,
  heading,
}: {
  sections: Section[];
  counts: Map<number, number>;
  selectedId?: number;
  heading: string;
}) {
  const byYear = new Map<number, Section[]>();
  for (const s of sections) byYear.set(s.year_level, [...(byYear.get(s.year_level) ?? []), s]);
  const years = Array.from(byYear).sort(([a], [b]) => a - b);

  return (
    <nav aria-label={heading}>
      <h2 className="text-base font-bold">{heading}</h2>
      {years.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No sections have been set up for this semester.</p>
      ) : (
        <dl className="mt-3 space-y-3">
          {years.map(([year, list]) => (
            <div key={year} className="flex flex-wrap items-center gap-2">
              <dt className="w-20 shrink-0 text-sm text-muted">Year {year}</dt>
              {list.map((s) => {
                const active = s.id === selectedId;
                const n = counts.get(s.id) ?? 0;
                return (
                  <dd key={s.id}>
                    <Link
                      href={`/schedules?section=${encodeURIComponent(s.code)}`}
                      aria-current={active ? 'page' : undefined}
                      aria-label={`${s.code}, ${n} classes a week`}
                      className={`inline-flex min-h-[40px] items-center rounded-md border px-3 text-sm font-semibold ${
                        active
                          ? 'border-lagoon bg-lagoon text-white'
                          : 'border-line-strong bg-surface text-ink hover:border-lagoon hover:text-lagoon'
                      }`}
                    >
                      {s.code}
                    </Link>
                  </dd>
                );
              })}
            </div>
          ))}
        </dl>
      )}
    </nav>
  );
}
