# Class Schedule Management System (CSMS)

**Tawi-Tawi Regional Agricultural College (TRAC)** — Bachelor of Science in Information Technology (BSIT)

A department-level Academic Scheduling Management Information System (MIS) built as a **modular monolith** with layered architecture, RBAC, and local-first SQLite deployment for LAN-based client/server access.

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
npm test
```

Open [http://localhost:3000](http://localhost:3000). The database auto-seeds on first run.

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Faculty | `fac-001` | `faculty123` |
| Student | `2022-0001` | `student123` |

## Tech Stack

- **Framework:** Next.js 14 (App Router) — Modular Monolith
- **Language:** TypeScript
- **Database:** SQLite (better-sqlite3) with WAL mode
- **Auth:** bcrypt password hashing, HTTP-only sessions
- **Styling:** Tailwind CSS

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
- [ ] Phase 5: User acceptance testing (UAT)

## Reference

Workflow inspired by [University-TimetableManagement-Portal](https://github.com/namanadlakha3/University-TimetableManagement-Portal). Scoped strictly to department-level BSIT scheduling — no grading, attendance, or enrollment features.
