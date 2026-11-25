# Changelog

## Unreleased

### Production release: design system and department tools
- **Added (database):** migration 003 with `room_bookings` and `announcements` (checks,
  indexes, row level security) and repo definitions of the evidence tables. Run it
  before deploying; see `docs/DEPLOYMENT.md`.
- **Added (admin):** Terms and periods, Room bookings, Announcements, Audit log; a
  dashboard that lists what needs attention.
- **Added (faculty):** own availability, weekly teaching load, today's classes.
- **Added (public):** `/today`, `/announcements`, bookings in room availability, a
  date-based free-room search, a home page built around the timetable.
- **Changed (design):** one light design system (lagoon, seagrass, sand; Atkinson
  Hyperlegible and Archivo) replacing the dark theme, glass effects and "Mission
  Control" copy; every admin page uses the same layout.
- **Removed:** fake status indicators, the unused "Remember me" box, dead components,
  `/api/public/stats`, and 7 unused dependencies.
- **Fixed:** evidence page and verification API used Postgres-only SQL; `npm run seed`
  now seeds the evidence layer.

### Students use the public site (no accounts)
- **Removed (breaking):** student login, `/student/*` pages and `/api/student`. Old links
  redirect to `/schedules`; old student logins are refused with a pointer to the public
  pages. Existing student user rows are left in the database, unused.
- **Added:** `/schedules` finder (by section or instructor, weekly grid or per-day list,
  class list, print, shareable links) and `/rooms` availability (free now on campus time,
  find a free room, weekly room schedule). Shared public navigation on all public pages.
- **Added:** `/forgot-password` page (the login form linked to a 404).
- **Changed:** landing page calls to action point students to schedules and rooms;
  "Staff sign in" for admins and faculty; broken `/admin` and `/student` footer links
  replaced.
- **Changed:** `/faculty` no longer shows employee IDs (login usernames) and runs on SQLite.

### Admin and faculty portals
- **Added:** Settings → Data environment (DEMO / VERIFIED / PRODUCTION), audited,
  optionally applied to the active semester's schedules: the switch that makes
  published classes public.
- **Changed:** one complete admin menu on every admin page (Schedule Status, Conflicts,
  Settings and Evidence had none) and a faculty menu with Change Password.
- **Fixed:** Settings listed the shared database's `public` tables (other apps) and
  rendered them blank; it now lists only CSMS tables.

### Security
- **Fixed:** the login rate limiter exempted "demo" usernames, including `admin`, so the
  production admin account accepted unlimited password guesses. Throttling is now per
  account (5 failures/15 min) and per IP (20 failures/15 min) with no exemptions.

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
- New faculty, student and user accounts no longer get the shared default password
  `faculty123` / `student123` when the admin leaves it blank. A random temporary
  password is generated, shown once, and must be changed at first login. Typed
  passwords must be at least 8 characters everywhere.
- `/admin/conflicts`, `/admin/evidence`, `/admin/schedules` and `/admin/settings` now
  require the admin role; any logged-in user could open them before.
- Security headers on every response: CSP, X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy, HSTS (production).
- The landing page no longer loads an unpinned script from unpkg at runtime.
- `approved_by` is bound as a query parameter instead of spliced into SQL.

### Added
- Custom 404 and error pages, `sitemap.xml`, `robots.txt`; optional `SITE_URL`.

### Fixed
- Dashboards and portal schedule pages (`PortalLayout`) are usable on phones: the
  sidebar is an off-canvas drawer below the `lg` breakpoint.
- `npm run seed` now creates the schema and demo data for a local SQLite database; it
  used to do nothing, and the real seeder failed on SQLite.

### Removed
- Stale, unused `postgresql-schema.sql` and the no-op `scripts/seed.ts`.

### Docs
- README and `docs/DEPLOYMENT.md` now describe production as it is (Render + shared
  Supabase PostgreSQL, `csms` schema): setup, env var names, migrations, deploy,
  post-deploy checks and rollback. `.env.example` leaves `DATABASE_URL` empty so local
  runs use SQLite instead of the shared database.

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

## Unreleased (database role)

### Added
- `db/migrations/001_csms_app_role.sql` (+ `.down.sql`): least-privilege `csms_app`
  login role limited to row access in the `csms` schema, with `search_path`, statement
  and idle-transaction timeouts set at login. Not applied automatically; see README.

### Fixed
- Production guard now recognises the project ref for any login role
  (`csms_app.<ref>`) and on direct `db.<ref>.supabase.co` hosts.
