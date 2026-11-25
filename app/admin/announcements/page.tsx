import { PortalLayout } from '@/components/PortalLayout';
import { ActionButton, ActionForm } from '@/components/admin/ActionForm';
import { requireAdmin } from '@/lib/auth';
import { listAnnouncements, type Announcement } from '@/lib/modules/mod-10-announcements/service';
import { campusNow, formatCampusDate } from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { readIfMigrated } from '@/lib/persistence/db';
import { ADMIN_NAV, navFor } from '@/lib/domain/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Announcements — TRAC BSIT admin' };

function stateOf(a: Announcement, today: string): { label: string; tone: string } {
  if (a.starts_on > today) return { label: 'Scheduled', tone: 'bg-lagoon-50 text-lagoon-dark' };
  if (a.ends_on && a.ends_on < today) return { label: 'Ended', tone: 'bg-paper-2 text-muted' };
  return { label: 'Showing', tone: 'bg-seagrass-50 text-seagrass' };
}

function Fields({ a, today }: { a?: Announcement; today: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="label-field">Title</span>
        <input name="title" className="input-field" maxLength={160} defaultValue={a?.title} required />
      </label>
      <label className="sm:col-span-2">
        <span className="label-field">Text</span>
        <textarea name="body" className="textarea-field" maxLength={4000} defaultValue={a?.body} required />
        <span className="hint">Plain text. Line breaks are kept.</span>
      </label>
      <label>
        <span className="label-field">Show from</span>
        <input name="starts_on" type="date" className="input-field" defaultValue={a?.starts_on ?? today} required />
      </label>
      <label>
        <span className="label-field">Show until (optional)</span>
        <input name="ends_on" type="date" className="input-field" defaultValue={a?.ends_on ?? ''} />
      </label>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input name="pinned" type="checkbox" defaultChecked={a?.pinned === 1} className="h-4 w-4" />
        <span>Pin to the top</span>
      </label>
    </div>
  );
}

export default async function AdminAnnouncementsPage() {
  const session = await requireAdmin();
  const { date: today } = campusNow();
  const items = await readIfMigrated(() => listAnnouncements(), null, 'announcements');

  return (
    <PortalLayout role="admin" name={session.name} links={navFor(ADMIN_NAV, '/admin/announcements')}>
      <h1 className="page-title">Announcements</h1>
      <p className="page-lead">
        Notices for students and visitors: schedule changes, class suspensions, enrollment dates. They appear on the
        home page and the Announcements page between their dates.
      </p>

      {items === null ? (
        <p className="notice-warning mt-6 max-w-prose">
          Announcements need database migration 003 (db/migrations/003_bookings_announcements_evidence.sql). Ask the
          database administrator to run it.
        </p>
      ) : (
        <>
          <section aria-labelledby="new-heading" className="card mt-8">
            <h2 id="new-heading" className="mb-3 text-lg font-bold">New announcement</h2>
            <ActionForm
              action="create-announcement"
              submitLabel="Post announcement"
              successMessage="Announcement posted."
              booleanFields={['pinned']}
            >
              <Fields today={today} />
            </ActionForm>
          </section>

          <section aria-labelledby="all-heading" className="mt-10">
            <h2 id="all-heading" className="text-xl font-bold">All announcements</h2>
            {items.length === 0 ? (
              <p className="mt-3 text-muted">Nothing posted yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {items.map((a) => {
                  const state = stateOf(a, today);
                  return (
                    <li key={a.id} className="card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold">
                            {a.title}
                            {a.pinned === 1 && <span className="ml-2 rounded bg-sand px-1.5 py-0.5 align-middle text-xs">Pinned</span>}
                          </h3>
                          <p className="text-sm text-muted">
                            <span className={`mr-2 rounded px-1.5 py-0.5 text-xs font-semibold ${state.tone}`}>{state.label}</span>
                            {formatCampusDate(a.starts_on, { weekday: false })}
                            {a.ends_on ? ` to ${formatCampusDate(a.ends_on, { weekday: false })}` : ', no end date'}
                          </p>
                        </div>
                        <ActionButton
                          action="delete-announcement"
                          payload={{ id: a.id }}
                          label="Delete"
                          variant="danger"
                          ariaLabel={`Delete announcement ${a.title}`}
                          confirmText={`Delete "${a.title}"? It disappears from the public site.`}
                        />
                      </div>
                      <p className="mt-2 max-w-prose whitespace-pre-line text-ink-soft">{a.body}</p>
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-lagoon">Edit</summary>
                        <ActionForm
                          action="update-announcement"
                          submitLabel="Save changes"
                          successMessage="Saved."
                          booleanFields={['pinned']}
                          extra={{ id: a.id }}
                          resetOnSuccess={false}
                          className="mt-3"
                        >
                          <Fields a={a} today={today} />
                        </ActionForm>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </PortalLayout>
  );
}
