# Changelog

## Unreleased

### Schedule board and publishing (MOD-05)
- **Fixed:** draft schedules were public. The landing-page count, `/sections` and the
  student and faculty portals listed every schedule; they now follow one visibility
  rule (staff: all; faculty: approved + published; students: published; public:
  published and non-DEMO).
- **Added:** submit / approve / publish / cancel controls on the Schedule Board, per
  class and in bulk. Before this, nothing could reach Published.
- **Added:** manual entry filters subjects by curriculum and faculty by subject,
  disables rooms too small for the section, previews conflicts live, and shows
  availability warnings that used to be dropped.
- **Fixed:** conflict errors reached the admin as "The record could not be saved"; the
  real reason is shown now.
- **Changed:** published classes are locked (cancel instead); moving a reviewed or
  approved class returns it to Draft; cancelled and archived classes free their slot.
- **Changed:** board shows Saturday slots, several classes per cell, loading/empty/error
  states, keyboard and touch actions; admin tool sidebar stacks on small screens.
- **Added:** `db/migrations/002_schedule_publish_workflow.sql` (+ `.down.sql`): the
  workflow columns production already had but no repo file created, and unique indexes
  against double bookings. Must be run manually; see README.

### Security
- `/admin/conflicts`, `/admin/evidence`, `/admin/schedules` and `/admin/settings` now
  require the admin role; any logged-in user could open them before.
- Security headers on every response: CSP, X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy, HSTS (production).
- The landing page no longer loads an unpinned script from unpkg at runtime.
- `approved_by` is bound as a query parameter instead of spliced into SQL.

### Added
- Custom 404 and error pages, `sitemap.xml`, `robots.txt`; optional `SITE_URL`.

### Fixed
- PostgreSQL adapter uses a connection pool instead of one shared client. Concurrent
  requests no longer share a transaction (a rollback could undo another user's writes),
  and a dropped connection no longer breaks every request until restart.
- Transactions run on a dedicated connection with `SET LOCAL search_path TO csms`.
- The app refuses to start serving if the active schema is not `csms`, so it can never
  read or write another app's tables in the shared database.
- `/api/health` now checks the database and returns 503 when it is down or on the wrong schema.

### Added
- Optional `PG_POOL_MAX` env var (default 5).

### Security
- `scripts/sync-demo-passwords.cjs` no longer runs in production unless
  `CSMS_SYNC_DEMO_PASSWORDS=1`; it used to reset six live accounts' passwords on every
  Render start. Hard-coded fallback passwords were removed; accounts without an env
  password are skipped. All its queries are qualified with `csms.`.
- `scripts/seed-render-db.ts` now calls the production-database guard.
