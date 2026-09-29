# PROJECT_CONTEXT.md — TRAC BSIT Class Schedule Management System

This file is for CSMS only. If a request mentions SmartCampus, RosarioSIS, Batu-Batu or PHP, stop and ask me.

This project uses a Next.js version with breaking changes. Read node_modules/next/dist/docs before writing code (see AGENTS.md).

> **Read this file at the start of every session and before any change.**
> If a requested change conflicts with the purpose, roles, or critical parts described here, flag it before proceeding.

**Production URL:** https://class-schedule-management-system-for-1myk.onrender.com
**Repository:** https://github.com/kerrfairtex/Class-Schedule-Management-System-for-information-technology-Students
**Status:** DEVELOPMENT — not formally institutionally adopted (spec §47)

---

## 1. Purpose

**Problem:** The BSIT department at Tawi-Tawi Regional Agricultural College (TRAC) needs to manage class schedules — assigning subjects to sections, faculty, rooms, and time slots while avoiding conflicts (double-booked faculty/rooms/sections). ASSUMPTION: Previously this was done manually or with spreadsheets.

**Solution:** A department-level Academic Scheduling Management Information System (MIS) that automates schedule generation, detects conflicts, and provides role-based portals for administrators, faculty, and students.

**For whom:** The BSIT program under the Institute of Computing Studies at TRAC, located in Nalil, Bongao, Tawi-Tawi, Philippines.

**Key files:** `README.md`, `lib/domain/constants.ts`, `docs/USER_GUIDE.md`

---

## 2. Users and Roles

Three roles, enforced by RBAC in `lib/modules/mod-01-auth/service.ts` and `middleware.ts`:

| Role | What they CAN do | What they CANNOT do |
|------|------------------|---------------------|
| **Admin** | **Master data:** Create and read all entities (faculty, students, subjects, sections, rooms, buildings, curriculum). **Schedules:** Generate, create, move, delete, and transition statuses. **System:** Backup database, view audit logs, set faculty availability. | Cannot delete or edit master data (no delete/update API exists). |
| **Faculty** | View own profile and teaching load. View own schedule (grid/list/print). | Cannot edit anything. Cannot view other faculty schedules. Cannot view faculty availability grid (admin-only). Cannot access admin pages. |
| **Student** | View own profile and section schedule. Search other section schedules by section code. View schedules (grid/list/print). | Cannot edit anything. Cannot view other students' data. Cannot access admin/faculty pages. |

**Public (unauthenticated):** Can view landing page (`/`), about (`/about`), evidence (`/about/evidence`), public schedules (`/schedules`), programs (`/programs`), faculty directory (`/faculty`), rooms (`/rooms`), academic calendar (`/academic-calendar`), contact (`/contact`), developers (`/developers`), user guide (`/user-guide`), user guidelines (`/user-guidelines`).

**Key files:** `lib/modules/mod-01-auth/service.ts` (`authorize()` function), `middleware.ts`, `app/api/admin/route.ts`, `app/api/faculty/route.ts`, `app/api/student/route.ts`

---

## 3. User Flows

### Admin Flow
1. **Sign in** at `/login` → `app/login/page.tsx` → `components/LoginForm.tsx` → POST `/api/auth/login` (`app/api/auth/login/route.ts`)
2. **Dashboard** at `/admin/dashboard` → `app/admin/dashboard/page.tsx` → `components/DashboardComponents.tsx` — entity counts
3. **Master data** at `/admin/master-list` → `app/admin/master-list/page.tsx` → `components/MasterListForm.tsx` — create-only (no update/delete)
4. **Schedules** at `/admin/schedule-board` → `app/admin/schedule-board/page.tsx` → `components/ScheduleBoard.tsx` — auto-generate or manual create/move/delete
5. **Faculty availability** at `/admin/faculty-availability` → `app/admin/faculty-availability/page.tsx`
6. **Conflicts** at `/admin/conflicts` → `app/admin/conflicts/page.tsx`
7. **Schedule statuses** — DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED → CANCELLED → ARCHIVED
8. **Backup** — POST `/api/admin` with `action: "backup"` → `lib/modules/mod-08-database-service/backup.ts`
9. **Audit logs** at `/admin/settings` → `app/admin/settings/page.tsx`

### Faculty Flow
1. **Sign in** at `/login`
2. **Dashboard** at `/faculty/dashboard` → `app/faculty/dashboard/page.tsx`
3. **Schedule** at `/faculty/schedule` → `app/faculty/schedule/page.tsx` → `components/ScheduleGrid.tsx` / `components/ScheduleList.tsx` — grid/list, print/PDF
4. **API:** GET `/api/faculty` → `app/api/faculty/route.ts` — own data only

### Student Flow
1. **Sign in** at `/login`
2. **Dashboard** at `/student/dashboard` → `app/student/dashboard/page.tsx`
3. **Schedule** at `/student/schedule` → `app/student/schedule/page.tsx` — auto-loads section schedule
4. **Search sections** — GET `/api/student?section=BSIT-2A` → `app/api/student/route.ts`
5. **API:** GET `/api/student` — own data only

### Public Flow
1. **Browse** landing page, about, evidence, public schedules, programs, faculty, rooms, academic calendar, contact — no login
2. **Click "Get Started"** or portal links → redirected to `/login`

**Key files:** All `app/*/page.tsx` files, `components/LoginForm.tsx`, `components/PortalLayout.tsx`, `components/Sidebar.tsx`

---

## 4. Critical Parts — What Must Never Break

| Component | Why it's critical | File |
|-----------|-------------------|------|
| **Authentication** | If broken, anyone can access admin functions or impersonate users | `lib/modules/mod-01-auth/service.ts`, `lib/modules/mod-01-auth/session.ts` |
| **Session signing** | Unsigned sessions in production = session forgery | `lib/modules/mod-01-auth/session.ts` (HMAC with `SESSION_SECRET`) |
| **RBAC / Middleware** | Unauthorized access to admin/faculty/student data | `middleware.ts`, `lib/modules/mod-01-auth/service.ts` (`authorize()`) |
| **Conflict detection** | Double-booked faculty/rooms/sections = real-world chaos | `lib/modules/mod-04-conflict-engine/validator.ts` |
| **Schedule generation** | Core value proposition — if this produces bad schedules, the system is useless | `lib/modules/mod-03-schedule-engine/service.ts` |
| **Database integrity** | SQLite corruption = total data loss | `lib/persistence/db.ts` (WAL mode, foreign keys, transactions) |
| **Backup** | No backup = no recovery from corruption | `lib/modules/mod-08-database-service/backup.ts` |
| **Audit log** | No audit trail = no accountability for changes | `lib/modules/mod-08-database-service/audit.ts` |
| **Rate limiting (login)** | Brute-force attacks on passwords | `app/api/auth/login/route.ts` (5 per 15 min per IP) |
| **Evidence/institutional facts** | Presenting unverified data as institutional fact = reputational harm | `lib/evidence/institutional-facts.ts`, `lib/persistence/seed.ts` |

---

## 5. Constraints

| Constraint | Details | Source |
|------------|---------|--------|
| **Deployment** | Render (recommended) with persistent disk at `/data`. Vercel = ephemeral SQLite in `/tmp` (demo only). | `docs/DEPLOYMENT.md`, `render.yaml` |
| **Database** | SQLite (better-sqlite3) — single-writer, file-based. Not suitable for high concurrency. Future migration to Postgres planned. | `lib/persistence/db.ts`, `docs/DEPLOYMENT.md` |
| **Offline needs** | LAN-based client/server access. No offline-first PWA capabilities. | `README.md` |
| **Target devices** | Students and faculty access primarily on phones, often on slow or unstable connections. The app is responsive (Tailwind) but has no service worker, no offline cache, and no data-slow-connection optimizations beyond normal browser caching. | `app/layout.tsx`, `components/PortalLayout.tsx` |
| **Accessibility** | Focus-visible rings, semantic HTML, ARIA labels in components. Dark theme with cyan accent. | `app/globals.css`, `components/` |
| **Node version** | 20.x required (`.node-version`, `package.json` engines) | `.node-version` |
| **Data directory** | `CSMS_DATA_DIR` env var. Defaults to `<project-root>/data` locally, `/tmp/csms-data` on Vercel, `/data/csms-data` on Render. | `lib/persistence/db.ts` |
| **Session security** | `SESSION_SECRET` env var required in production. Without it, sessions are unsigned (development only). | `lib/modules/mod-01-auth/session.ts` |
| **Default passwords** | `admin123`, `faculty123`, `student123` — MUST be rotated before any shared deployment. | `README.md`, `lib/persistence/seed.ts` |
| **System status** | DEVELOPMENT — not formally institutionally adopted (spec §47). Displayed on homepage. | `lib/domain/constants.ts` |

---

## 6. Known Gaps (top 5, priority order)

| # | Gap | Impact |
|---|-----|--------|
| 1 | **Account creation uses predictable usernames and default passwords** | Usernames are `employee_id` and `student_id` (publicly known). Default passwords are `faculty123` and `student123` unless the admin types one. No code path forces a random or unique password. 3 code paths create users: seed (`lib/persistence/seed.ts:210,217,230`), faculty creation (`app/api/admin/route.ts:202-207`), student creation (`app/api/admin/route.ts:225-230`). All use predictable defaults. |
| 2 | **No password change or reset** | All three roles (admin, faculty, student) must use direct SQL to change passwords. No UI or API exists. Default passwords may persist if env vars are not set before first deploy. |
| 3 | **No must_change_password flag** | Seeded accounts with default passwords are not forced to change them on first login. |
| 4 | **No edit or delete for master data** | Cannot correct typos in faculty names, room codes, section codes, etc. Cannot remove obsolete entities. |
| 5 | **No bulk import** | Onboarding 100+ students requires individual form submissions. |

Full gaps list and security roadmap: see `docs/SECURITY_ROADMAP_DRAFT.md` (PROPOSED, NOT IMPLEMENTED).

---

## 7. Change Control Rules

- **Show file content before committing.** Always display the full content of any file to be committed before staging.
- **Do not push until approved.** No `git push` without explicit user approval.
- **Read this file first.** At the start of every session and before any change, re-read this document.
- **Flag conflicts.** If a requested change conflicts with the purpose, roles, or critical parts described here, flag it before proceeding.
