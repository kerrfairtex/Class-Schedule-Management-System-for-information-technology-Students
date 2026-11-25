import { PortalLayout } from '@/components/PortalLayout';
import { ActionButton, ActionForm } from '@/components/admin/ActionForm';
import { requireAdmin } from '@/lib/auth';
import { getRooms } from '@/lib/modules/mod-02-master-list/service';
import { BOOKING_KINDS, BOOKING_KIND_LABEL, listBookings } from '@/lib/modules/mod-09-room-bookings/service';
import { campusNow, formatCampusDate, formatRange } from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { readIfMigrated } from '@/lib/persistence/db';
import { ADMIN_NAV, navFor } from '@/lib/domain/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Room bookings — TRAC BSIT admin' };

export default async function BookingsPage() {
  const session = await requireAdmin();
  const now = campusNow();
  const [rooms, bookings] = await Promise.all([
    getRooms(),
    readIfMigrated(() => listBookings({ fromDate: now.date }), null, 'room bookings'),
  ]);

  // Group upcoming bookings by date for scanning.
  const byDate = new Map<string, NonNullable<typeof bookings>>();
  for (const b of bookings ?? []) byDate.set(b.booking_date, [...(byDate.get(b.booking_date) ?? []), b]);

  return (
    <PortalLayout role="admin" name={session.name} links={navFor(ADMIN_NAV, '/admin/bookings')}>
      <h1 className="page-title">Room bookings</h1>
      <p className="page-lead">
        Reserve a room for an exam, event, meeting or maintenance. A booking cannot overlap another booking or a class
        that meets in the room that day. Bookings show on the public Rooms and Today pages.
      </p>

      {bookings === null ? (
        <p className="notice-warning mt-6 max-w-prose">
          Room bookings need database migration 003 (db/migrations/003_bookings_announcements_evidence.sql). Ask the
          database administrator to run it.
        </p>
      ) : (
        <>
          <section aria-labelledby="new-heading" className="card mt-8">
            <h2 id="new-heading" className="text-lg font-bold">New booking</h2>
            <ActionForm
              action="create-booking"
              submitLabel="Book room"
              successMessage="Room booked."
              numberFields={['room_id']}
            >
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="sm:col-span-2">
                  <span className="label-field">Title</span>
                  <input name="title" className="input-field" maxLength={160} placeholder="IT 121 midterm exam" required />
                </label>
                <label>
                  <span className="label-field">Type</span>
                  <select name="kind" className="select-field" required defaultValue="EXAM">
                    {BOOKING_KINDS.map((k) => (
                      <option key={k} value={k}>{BOOKING_KIND_LABEL[k]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label-field">Room</span>
                  <select name="room_id" className="select-field" required defaultValue="">
                    <option value="" disabled>Choose…</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.code}, {r.name} ({r.capacity} seats)</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label-field">Date</span>
                  <input name="booking_date" type="date" min={now.date} defaultValue={now.date} className="input-field" required />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="label-field">Starts</span>
                    <input name="start_time" type="time" className="input-field" required />
                  </label>
                  <label>
                    <span className="label-field">Ends</span>
                    <input name="end_time" type="time" className="input-field" required />
                  </label>
                </div>
                <label className="sm:col-span-2 lg:col-span-3">
                  <span className="label-field">Notes (optional)</span>
                  <textarea name="notes" className="textarea-field min-h-[80px]" maxLength={1000} />
                </label>
              </div>
            </ActionForm>
          </section>

          <section aria-labelledby="upcoming-heading" className="mt-10">
            <h2 id="upcoming-heading" className="text-xl font-bold">Upcoming</h2>
            {byDate.size === 0 ? (
              <p className="mt-3 text-muted">No upcoming bookings.</p>
            ) : (
              <div className="mt-3 space-y-6">
                {Array.from(byDate).map(([date, list]) => (
                  <div key={date}>
                    <h3 className="font-bold">
                      <time dateTime={date}>{formatCampusDate(date)}</time>
                      {date === now.date && <span className="ml-2 text-sm font-normal text-muted">today</span>}
                    </h3>
                    <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-surface">
                      <table className="data-table min-w-[560px]">
                        <thead>
                          <tr>
                            <th scope="col">Time</th>
                            <th scope="col">Room</th>
                            <th scope="col">Booking</th>
                            <th scope="col"><span className="sr-only">Actions</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((b) => (
                            <tr key={b.id}>
                              <td className="whitespace-nowrap">{formatRange(b.start_time, b.end_time)}</td>
                              <td>{b.room_code}</td>
                              <td>
                                <strong>{b.title}</strong>
                                <span className="ml-2 text-muted">{BOOKING_KIND_LABEL[b.kind]}</span>
                                {b.notes && <p className="text-xs text-muted">{b.notes}</p>}
                              </td>
                              <td className="text-right">
                                <ActionButton
                                  action="delete-booking"
                                  payload={{ id: b.id }}
                                  label="Cancel"
                                  variant="danger"
                                  ariaLabel={`Cancel booking ${b.title}`}
                                  confirmText={`Cancel the booking "${b.title}"?`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </PortalLayout>
  );
}
