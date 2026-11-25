# Class Schedule Management System (CSMS)

**Tawi-Tawi Regional Agricultural College (TRAC)** — Bachelor of Science in Information Technology (BSIT)

A department-level Academic Scheduling Management Information System (MIS) built as a **modular monolith** with layered architecture, RBAC, and local-first SQLite deployment for LAN-based client/server access.

## Developers

The CSMS was developed by the following students of the BSIT program:

- Jimlani Paiji K.
- Albashrie Mashul A.
- Haidin Magbanua S.
- Jemmarie Ubias A.
- Aizalyn Kasim D.

The developer list represents the system developers and does not constitute the official TRAC administration or institutional contact directory. For institutional inquiries, contact the official TRAC offices (see `app/contact/page.tsx`).

## Architecture

```
Desktop Browser (Admin / Faculty / Student)
                │
                ▼
Presentation Layer — Dashboard, Schedule Board, Reports, Auth
                │
                ▼
Application Layer
  MOD-01 Authentication    MOD-05 Manual Adjustment
  MOD-02 Master List       MOD-06 Faculty Portal
  MOD-03 Schedule Engine   MOD-07 Student Portal
  MOD-04 Conflict Engine   MOD-08 Database Service
                │
                ▼
Domain Layer — Faculty, Subjects, Sections, Rooms, Schedules, etc.
                │
                ▼
Persistence Layer — SQLite, Repository, Backup, Transactions
```

## Modules

| Module | Description |
|--------|-------------|
| MOD-01 | RBAC authentication, session management, password hashing |
| MOD-02 | Master list — source of truth for all scheduling entities |
| MOD-03 | Rule-based schedule generation engine |
| MOD-04 | Conflict detection (faculty, room, section overlaps) |
| MOD-05 | Admin drag-and-drop schedule board with live validation |
| MOD-06 | Faculty portal — view and print schedules (read-only) |
| MOD-07 | Student portal — search, view, and print schedules (read-only) |
| MOD-08 | Database backup, audit logging, transactions |

## Getting Started (local development)

> **Use a local SQLite database for development.** The Supabase project is a
> **shared database used by other apps**, and production data lives in its `csms`
> schema. If `DATABASE_URL` is set (in your shell or a `.env` file) the app connects
> to it, so a "local" run would read and write production. Keep `DATABASE_URL`
> empty locally.

```bash
npm install
DATABASE_URL= npm run seed   # creates ./data/csms.db with the schema and demo data
DATABASE_URL= npm run dev    # http://localhost:3000
```

`npm run seed` is safe to re-run and refuses to run against the production
database (`lib/guards/production-database.ts`). Set `CSMS_DATA_DIR` to put the SQLite
file somewhere other than `./data`.

### Run Tests

```bash
npm test                  # unit, integration and UAT tests (in-memory SQLite)
npm run test:uat          # UAT acceptance tests only
npm run uat:api           # API-level UAT (needs a running local dev server)
bash scripts/verify.sh    # full gate: lint, tests, build, typecheck, secrets scan
```

The test setup refuses to run destructive suites when `DATABASE_URL` points at production.

### Local demo accounts

`npm run seed` creates these accounts **in your local database only**. Every one must
change its password at first login. Override with the env vars shown. The seeder never
runs against production.

| Role | Username | Local password | Override |
|------|----------|----------------|----------|
| Admin | `admin` | `admin123` | `ADMIN_PASSWORD` |
| Faculty | `fac-001` | `faculty123` | `FACULTY_PASSWORD` |
| Student | `2022-0001` | `student123` | `STUDENT_PASSWORD` |

Accounts that admins create in the app have no default password: leave the password
blank and a random temporary password is generated and shown once.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React, TypeScript; modular monolith
- **Database:** PostgreSQL on Supabase (`csms` schema) in production; SQLite
  (better-sqlite3) for local development and tests, through the same adapter
  (`lib/persistence/db.ts`)
- **Auth:** bcrypt password hashing, signed HTTP-only session cookies (8-hour expiry),
  login rate limit of 5 attempts per 15 minutes per IP
- **Styling:** Tailwind CSS
- **Hosting:** Render web service (Node 20)

## Deployment

Production is a **Render web service** that auto-deploys the `main` branch, connected to
the **Supabase** PostgreSQL database. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for
the full steps, post-deploy checks and rollback.

- Build: `npm install; npm run build`
- Start: `node .next/standalone/server.js`
- Health: `GET /api/health` returns `"database":"up"` when the app and database are OK.

> `render.yaml` is not the source of truth: it still describes a Render-hosted
> database and an SQLite disk. The settings in the Render dashboard are what run.

### Database migrations (PostgreSQL)

The Supabase database is **shared with other apps**. CSMS owns only the `csms` schema;
never change anything outside it. The app never changes the schema on startup:
production changes are numbered SQL files in `db/migrations/`, each additive,
idempotent and paired with a `.down.sql` rollback, run by hand:

1. Read the file. Every migration must touch only `csms`.
2. Take a backup first (Supabase dashboard backup, or `pg_dump -n csms`).
3. Run it as `postgres` in the Supabase SQL editor (or `psql`).
4. To roll back, run the matching `.down.sql`.

| File | What it does |
|---|---|
| `001_csms_app_role.sql` | Least-privilege `csms_app` login role (no password set) |
| `002_schedule_publish_workflow.sql` | Adds the schedule workflow columns the app relies on, plus unique indexes that stop double-booked rooms, faculty and sections. Refuses to run, changing nothing, if existing rows already clash. |

Fresh local databases get their schema from `initSchema()` in `lib/persistence/db.ts`
(via `npm run seed`). Keep it in step with the migrations.

### Environment variables

Names only; never commit values. `.env.example` lists them.

| Name | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Production | Supabase PostgreSQL, session pooler (port 5432). **Leave empty locally** to use SQLite |
| `SESSION_SECRET` | Production | Signs session cookies (32+ random characters) |
| `NODE_ENV` | Production | `production` |
| `SITE_URL` | Optional | Public origin for sitemap, robots.txt and Open Graph (defaults to the Render URL) |
| `PG_POOL_MAX` | Optional | PostgreSQL pool size (default 5) |
| `CSMS_DATA_DIR` | Local | SQLite directory (default `./data`) |
| `ADMIN_PASSWORD`, `FACULTY_PASSWORD`, `STUDENT_PASSWORD` | Local | Passwords for the local demo accounts |
| `SEED_DEFAULT_USERS` | Local | `0` to skip creating demo accounts |
| `CSMS_ALLOW_PRODUCTION_WRITES` | Never set by default | `1` overrides the production-database guard. Only for a deliberate, reviewed production fix |
| `CSMS_SYNC_DEMO_PASSWORDS` | Never in production | `1` lets the start script sync demo passwords |
| `CSMS_DISABLE_MUST_CHANGE_PASSWORD` | Testing only | `1` skips the forced password change |

## Schedule publishing workflow

Schedules are created on the **Schedule Board** (`/admin/schedule-board`) as **Draft**,
either manually or by auto-generation, and move through:

`Draft → Pending review → Approved → Published` (then `Cancelled` / `Archived`).

| Who | Sees |
|---|---|
| Admin (board, `/admin/schedules`) | Every status |
| Faculty portal | Approved and Published |
| Student portal | Published |
| Public site (`/`, `/sections`, `/schedules`) | Published, and only when the deployment's `data_environment` setting is `VERIFIED` or `PRODUCTION` (DEMO data is never public) |

Published classes are locked: cancel one instead of moving or deleting it. Moving a
class that is pending review or approved returns it to Draft. Publishing is refused
while a blocking conflict exists. The rule lives in
`lib/modules/mod-03-schedule-engine/visibility.ts`; use it for any new schedule list.

## Project Structure

```
lib/
├── domain/              # Domain entities and constants
├── persistence/         # PostgreSQL/SQLite adapter, schema, seed, transactions
└── modules/
    ├── mod-01-auth/     # Authentication & RBAC
    ├── mod-02-master-list/
    ├── mod-03-schedule-engine/
    ├── mod-04-conflict-engine/
    └── mod-08-database-service/
app/
├── admin/               # Dashboard, master list, schedule board, availability
├── faculty/             # Dashboard + view-only schedule (grid/list/print)
├── student/             # Dashboard + view-only schedule (search/grid/list/print)
├── api/                 # REST API routes (presentation ↔ application layer)
middleware.ts            # Route protection (MOD-01 RBAC)
lib/api/                 # Typed frontend API client
```

## Development Roadmap

- [x] Phase 1: Authentication, Master List, Database schema
- [x] Phase 2: Schedule Generation, Conflict Detection
- [x] Phase 3: Manual Adjustment, Faculty Portal, Student Portal (fullstack dashboards, grid/list views, print/PDF, manual CRUD)
- [x] Phase 4: Database Service (backup, audit logging)
- [x] Phase 5: Unit tests for MOD-03/MOD-04
- [x] Phase 5: Integration tests (auth + scheduling workflows)
- [x] Phase 5: User acceptance testing (UAT) — see [docs/UAT.md](docs/UAT.md)

## Reference

Workflow inspired by [University-TimetableManagement-Portal](https://github.com/namanadlakha3/University-TimetableManagement-Portal). Scoped strictly to department-level BSIT scheduling — no grading, attendance, or enrollment features.
