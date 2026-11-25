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

## Getting Started

```bash
npm install
npm run dev
```

### Run Tests

```bash
npm test          # unit + integration + UAT acceptance tests
npm run test:uat  # UAT acceptance tests only
npm run uat:api   # API-level UAT (requires dev server)
```

Open [http://localhost:3000](http://localhost:3000). The database auto-seeds on first run.

### Runtime Data Directory

- Local development defaults to `<project-root>/data`
- Vercel runs use `/tmp/csms-data` for ephemeral preview/demo storage
- Railway defaults to `/data/csms-data`; attach a persistent volume to `/data`
- Override any environment with `CSMS_DATA_DIR=/absolute/path`

## Demo Credentials

> **⚠️ SECURITY WARNING:** These are development defaults only. **All passwords MUST be rotated before capstone submission or any shared deployment.** The system enforces signed session cookies in production (requires `SESSION_SECRET` env var). Default users are only created when `SEED_DEFAULT_USERS=1` (default).

| Role | Username | Password | Env Override |
|------|----------|----------|--------------|
| Admin | `admin` | `admin123` | `ADMIN_PASSWORD` |
| Faculty | `fac-001` | `faculty123` | `FACULTY_PASSWORD` |
| Student | `2025-0001` | `student123` | `STUDENT_PASSWORD` |

**Production Checklist:**
- [ ] Set `SESSION_SECRET` to a strong random string (32+ chars)
- [ ] Override all default passwords via environment variables
- [ ] Set `SEED_DEFAULT_USERS=0` to disable default user creation
- [ ] Configure `CSMS_DATA_DIR` to a persistent volume path
- [ ] Enable HTTPS (automatic on Vercel/Railway)
- [ ] Review rate limiting: login endpoint limited to 5 attempts per 15 minutes per IP

## Tech Stack

- **Framework:** Next.js 14 (App Router) — Modular Monolith
- **Language:** TypeScript
- **Database:** SQLite (better-sqlite3) with WAL mode
- **Auth:** bcrypt password hashing, HTTP-only sessions
- **Styling:** Tailwind CSS

## Deployment

### Vercel

Vercel can build and run the app, but this project uses local SQLite storage. On Vercel the database is stored in `/tmp`, so data is ephemeral and can reset between deployments or cold starts. Use Vercel only for preview/demo environments unless you replace SQLite with a managed database.

### Railway

Railway is the recommended production target for the current architecture.

1. Create a Railway project for the repository
2. Attach a persistent volume mounted at `/data`
3. Set `CSMS_DATA_DIR=/data/csms-data` if you use a different mount path
4. Deploy with the existing commands:
   - Build: `npm run build`
   - Start: `npm start`

The app already produces a standalone Next.js build and will auto-seed the SQLite database on first boot.

> Note: Supabase/Postgres variables are future-migration settings and are not required unless `lib/persistence/*` is migrated away from SQLite.

### Database migrations (PostgreSQL)

Production schema changes are numbered SQL files in `db/migrations/`, each additive,
idempotent and paired with a `.down.sql` rollback. They are **not** run automatically:

1. Take a backup first (Supabase dashboard backup, or `pg_dump -n csms`).
2. Run the file as `postgres` in the Supabase SQL editor (or `psql`).
3. To roll back, run the matching `.down.sql`.

| File | What it does |
|---|---|
| `001_csms_app_role.sql` | Least-privilege `csms_app` login role (no password set) |
| `002_schedule_publish_workflow.sql` | Adds the schedule workflow columns the app relies on, plus unique indexes that stop double-booked rooms, faculty and sections. Refuses to run, changing nothing, if existing rows already clash. |

### Environment variables

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Production | PostgreSQL connection (session pooler). Empty → local SQLite |
| `SESSION_SECRET` | Production | Signs session cookies |
| `SITE_URL` | No | Public origin for sitemap, robots.txt and Open Graph (defaults to the Render URL) |
| `PG_POOL_MAX` | No | PostgreSQL pool size (default 5) |
| `CSMS_DATA_DIR` | No | SQLite data directory (default `./data`) |

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
├── persistence/         # SQLite, seed, transactions
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
