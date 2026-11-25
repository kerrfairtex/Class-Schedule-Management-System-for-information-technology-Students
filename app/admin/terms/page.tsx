import { PortalLayout } from '@/components/PortalLayout';
import { ActionButton, ActionForm } from '@/components/admin/ActionForm';
import { requireAdmin } from '@/lib/auth';
import { listTerms, SEMESTER_NAMES } from '@/lib/modules/mod-02-master-list/terms';
import { getTimeSlots } from '@/lib/modules/mod-02-master-list/service';
import { daysOf, formatRange } from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { DAY_LABELS, WEEK_ORDER } from '@/lib/domain/constants';
import { ADMIN_NAV, navFor } from '@/lib/domain/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Terms and periods — TRAC BSIT admin' };

export default async function TermsPage() {
  const session = await requireAdmin();
  const [years, slots] = await Promise.all([listTerms(), getTimeSlots()]);
  const days = daysOf(slots);

  return (
    <PortalLayout role="admin" name={session.name} links={navFor(ADMIN_NAV, '/admin/terms')}>
      <h1 className="page-title">Terms and periods</h1>
      <p className="page-lead">
        One semester is active at a time. The schedule board, auto-generation and the public site all use the active
        semester.
      </p>

      <section aria-labelledby="years-heading" className="mt-8">
        <h2 id="years-heading" className="text-xl font-bold">Academic years</h2>
        {years.length === 0 ? (
          <p className="mt-3 text-muted">No academic years yet. Add the first one below.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {years.map((y) => (
              <li key={y.id} className="card">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-bold">
                    A.Y. {y.label}
                    {y.is_active === 1 && (
                      <span className="ml-2 rounded bg-seagrass-50 px-2 py-0.5 align-middle text-xs font-semibold text-seagrass">
                        Current
                      </span>
                    )}
                  </h3>
                  {y.start_date && y.end_date && (
                    <p className="text-sm text-muted">
                      {y.start_date} to {y.end_date}
                    </p>
                  )}
                </div>
                {y.semesters.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No semesters yet.</p>
                ) : (
                  <table className="data-table mt-3">
                    <thead>
                      <tr>
                        <th scope="col">Semester</th>
                        <th scope="col">Classes</th>
                        <th scope="col"><span className="sr-only">Status</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {y.semesters.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td className="tabular">{s.schedule_count}</td>
                          <td className="text-right">
                            {s.is_active === 1 ? (
                              <span className="font-semibold text-seagrass">Active</span>
                            ) : (
                              <ActionButton
                                action="activate-semester"
                                payload={{ id: s.id }}
                                label="Make active"
                                ariaLabel={`Make ${s.name}, ${y.label} the active semester`}
                                confirmText={`Make ${s.name}, A.Y. ${y.label} the active semester? The schedule board and public site will switch to it.`}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <ActionForm
                  action="add-semester"
                  submitLabel="Add semester"
                  successMessage="Semester added."
                  numberFields={['academicYearId']}
                  extra={{ academicYearId: y.id }}
                  className="mt-4 border-t border-line pt-4"
                >
                  <label className="block max-w-xs">
                    <span className="label-field">Add a semester to {y.label}</span>
                    <select name="name" className="select-field" required defaultValue="">
                      <option value="" disabled>Choose…</option>
                      {SEMESTER_NAMES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}

        <div className="card mt-4">
          <h3 className="text-lg font-bold">New academic year</h3>
          <ActionForm action="create-academic-year" submitLabel="Add academic year" successMessage="Academic year added.">
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label>
                <span className="label-field">Academic year</span>
                <input name="label" className="input-field" placeholder="2027-2028" pattern="\d{4}-\d{4}" required />
              </label>
              <label>
                <span className="label-field">Starts (optional)</span>
                <input name="start_date" type="date" className="input-field" />
              </label>
              <label>
                <span className="label-field">Ends (optional)</span>
                <input name="end_date" type="date" className="input-field" />
              </label>
            </div>
          </ActionForm>
        </div>
      </section>

      <section aria-labelledby="periods-heading" className="mt-12">
        <h2 id="periods-heading" className="text-xl font-bold">Class periods</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          The time slots classes can be scheduled into. A period that any class uses cannot be removed.
        </p>
        {days.length === 0 ? (
          <p className="mt-3 text-muted">No periods yet.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {days.map((d) => (
              <div key={d} className="rounded-lg border border-line bg-surface">
                <h3 className="border-b border-line px-4 py-2 font-bold">{DAY_LABELS[d] ?? d}</h3>
                <ul className="divide-y divide-line">
                  {slots
                    .filter((s) => s.day_of_week === d)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                        <time>{formatRange(s.start_time, s.end_time)}</time>
                        <ActionButton
                          action="delete-time-slot"
                          payload={{ id: s.id }}
                          label="Remove"
                          variant="danger"
                          ariaLabel={`Remove ${DAY_LABELS[d]} ${formatRange(s.start_time, s.end_time)}`}
                          confirmText={`Remove the ${DAY_LABELS[d]} ${formatRange(s.start_time, s.end_time)} period?`}
                        />
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="card mt-4">
          <h3 className="text-lg font-bold">Add a period</h3>
          <ActionForm action="add-time-slot" submitLabel="Add period" successMessage="Period added." resetOnSuccess={false}>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label>
                <span className="label-field">Day</span>
                <select name="day_of_week" className="select-field" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {WEEK_ORDER.map((d) => (
                    <option key={d} value={d}>{DAY_LABELS[d]}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label-field">Starts</span>
                <input name="start_time" type="time" className="input-field" required />
              </label>
              <label>
                <span className="label-field">Ends</span>
                <input name="end_time" type="time" className="input-field" required />
              </label>
            </div>
          </ActionForm>
        </div>
      </section>
    </PortalLayout>
  );
}
