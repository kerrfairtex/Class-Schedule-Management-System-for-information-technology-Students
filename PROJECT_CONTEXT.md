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
2. **Land on dashboard** at `/admin/dashboard` → `app/admin/dashboard/page.tsx` → `components/DashboardComponents.tsx` — shows entity counts (faculty, students, subjects, sections, rooms)
3. **Manage master data** at `/admin/master-list` → `app/admin/master-list/page.tsx` → `components/MasterListForm.tsx` — create-only for faculty, students, subjects, sections, rooms, buildings, curriculum (no update or delete)
4. **Generate schedules** at `/admin/schedule-board` → `app/admin/schedule-board/page.tsx` → `components/ScheduleBoard.tsx` — auto-generate per section or manual create/move/delete
5. **Set faculty availability** at `/admin/faculty-availability` → `app/admin/faculty-availability/page.tsx` — grid of faculty × time slots
6. **View conflicts** at `/admin/conflicts` → `app/admin/conflicts/page.tsx` — blocking and non-blocking conflicts
7. **Manage schedule statuses** — transition through DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED → CANCELLED → ARCHIVED
8. **Backup database** — POST `/api/admin` with `action: "backup"` → `lib/modules/mod-08-database-service/backup.ts`
9. **View audit logs** at `/admin/settings` → `app/admin/settings/page.tsx` — `lib/modules/mod-08-database-service/audit.ts`

### Faculty Flow
1. **Sign in** at `/login` → same login page
2. **Land on dashboard** at `/faculty/dashboard` → `app/faculty/dashboard/page.tsx` — shows stats and faculty info
3. **View schedule** at `/faculty/schedule` → `app/faculty/schedule/page.tsx` → `components/ScheduleGrid.tsx` / `components/ScheduleList.tsx` — grid/list toggle, print/PDF
4. **API:** GET `/api/faculty` → `app/api/faculty/route.ts` — returns `{ faculty, schedules, semester }` (own data only)

### Student Flow
1. **Sign in** at `/login` → same login page
2. **Land on dashboard** at `/student/dashboard` → `app/student/dashboard/page.tsx` — shows stats and student info
3. **View own schedule** at `/student/schedule` → `app/student/schedule/page.tsx` — auto-loads their section schedule
4. **Search other sections** — section code input → GET `/api/student?section=BSIT-2A` → `app/api/student/route.ts`
5. **API:** GET `/api/student` → returns `{ student, schedules, semester }`

### Public Flow
1. **Browse** landing page, about, evidence, public schedules, programs, faculty, rooms, academic calendar, contact — all without login
2. **Click "Get Started"** or portal links → redirected to `/login`

**Key files:** All `app/*/page.tsx` files, `components/LoginForm.tsx`, `components/PortalLayout.tsx`, `components/Sidebar.tsx`

---

## 4. Core Workflow

### Data Flow: Input → Storage → Output

```
Admin Input (Master List)
    ↓
lib/modules/mod-02-master-list/service.ts (create-only operations)
    ↓
SQLite tables: faculty, students, subjects, sections, rooms, buildings, curriculum, faculty_subjects
    ↓
Schedule Generation (MOD-03)
    ↓
lib/modules/mod-03-schedule-engine/service.ts
    ↓
For each section → for each curriculum subject → find faculty → find time slot → find room → check conflicts → INSERT
    ↓
Conflict Detection (MOD-04)
    ↓
lib/modules/mod-04-conflict-engine/validator.ts
    ↓
Checks: faculty double-booking, room double-booking, section double-booking, capacity mismatch (BLOCKING)
         faculty unavailability (NON-BLOCKING)
    ↓
SQLite table: schedules (with status: DRAFT/PENDING_REVIEW/APPROVED/PUBLISHED/CANCELLED/ARCHIVED)
    ↓
Output: Faculty portal, Student portal, Public schedules, Admin schedule board
```

### Schedule Status Workflow (spec §32-34)

Allowed transitions from `transitionSchedule()` in `lib/modules/mod-03-schedule-engine/service.ts`:

| From Status | Allowed To | Who |
|-------------|-----------|-----|
| DRAFT | PENDING_REVIEW, ARCHIVED | Admin |
| PENDING_REVIEW | DRAFT, APPROVED, ARCHIVED | Admin |
| APPROVED | DRAFT, PUBLISHED, ARCHIVED | Admin |
| PUBLISHED | CANCELLED, ARCHIVED | Admin |
| CANCELLED | ARCHIVED | Admin |
| ARCHIVED | (none) | — |

- PUBLISHED requires zero blocking conflicts (enforced in `transitionSchedule()`)
- All transitions are audit-logged
- Only admin can trigger transitions (via POST `/api/admin` with `action: "transition-schedule"`)

### Conflict Detection (spec §33)
- **BLOCKING** (prevents creation/publication): faculty, room, section, capacity
- **NON-BLOCKING** (advisory only): faculty availability
- Key file: `lib/modules/mod-04-conflict-engine/validator.ts`

### Authentication Flow
1. POST `/api/auth/login` with `{ username, password }`
2. `authenticate()` in `lib/modules/mod-01-auth/service.ts` — bcrypt verify against `users` table
3. `toSessionUser()` — resolves display name from faculty/students table
4. `setSession()` in `lib/modules/mod-01-auth/session.ts` — creates HMAC-signed cookie `csms_session` (HTTP-only, 8-hour max age)
5. Middleware checks cookie on all `/admin/*`, `/faculty/*`, `/student/*` routes
6. `authorize()` checks role membership

### Database Schema (SQLite, WAL mode)
Key tables (from `lib/persistence/db.ts`):
- `users` — id, username, password_hash, role, faculty_id, student_id, is_active
- `departments`, `programs`, `academic_years`, `semesters`
- `buildings`, `rooms` (with capacity)
- `subjects`, `curriculum` (program_id, subject_id, year_level, semester_number)
- `sections` (with capacity)
- `faculty`, `faculty_subjects` (many-to-many), `faculty_availability`
- `students`
- `time_slots` (day_of_week, start_time, end_time)
- `schedules` (section_id, subject_id, faculty_id, room_id, time_slot_id, semester_id, status, published_at, approved_by)
- `audit_logs`
- Evidence tables: `sources`, `institutional_facts`, `fact_sources`, `verification_records`, `officials`, `institution_contacts`, `system_settings`

---

## 5. Impact

| User | What gets better |
|------|-----------------|
| **Admin** | Replaces manual spreadsheet scheduling with automated generation, conflict detection, and audit trails. One-click backup. Status workflow ensures quality control before publication. |
| **Faculty** | Self-service view of teaching load. No need to email admin for schedule changes. Print/PDF for personal records. |
| **Student** | 24/7 access to class schedule via web. Search any section's schedule. Print/PDF for personal records. |
| **Institution** | Verified institutional facts system (`lib/evidence/institutional-facts.ts`) ensures public-facing information is sourced and auditable. Evidence pages show provenance. |

**Why this matters at TRAC BSIT:** ASSUMPTION — Before CSMS, scheduling was manual — prone to double-booked rooms, faculty assigned to overlapping classes, and sections with no clear timetable. Students and faculty had no self-service access; every schedule change required admin intervention. CSMS removes that friction: automated conflict detection catches problems before they reach students, and role-based portals give each user exactly the view they need.

---

## 6. Critical Parts — What Must Never Break

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

## 7. Constraints

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

## 8. Verification Results (2026-09-28)

### 8.1 Landing-page stats are hardcoded

**YES — all four are hardcoded in `app/page.tsx`, not pulled from the database.**

| Stat | Line | Value | Real? |
|------|------|-------|-------|
| Academic Departments | `app/page.tsx:121` | 4 | ASSUMPTION — placeholder, not from DB |
| Active Faculty Members | `app/page.tsx:130` | 12 | ASSUMPTION — placeholder, not from DB |
| Courses Offered | `app/page.tsx:139` | 38 | ASSUMPTION — placeholder, not from DB |
| Class Sections Scheduled | `app/page.tsx:148` | 156 | ASSUMPTION — placeholder, not from DB |

The admin dashboard (`app/admin/dashboard/page.tsx`) shows real counts from `getDashboardStats()`, but the public landing page uses static JSX numbers.

### 8.2 Default passwords still work

**YES — `admin123`, `faculty123`, `student123` are still the seed defaults.**

In `lib/persistence/seed.ts`:
- `getEnvPassword('ADMIN_PASSWORD', 'admin123')` — uses env var if set and ≥8 chars, otherwise falls back to `admin123`
- `getEnvPassword('FACULTY_PASSWORD', 'faculty123')` — same pattern
- `getEnvPassword('STUDENT_PASSWORD', 'student123')` — same pattern

These are seeded when `SEED_DEFAULT_USERS !== '0'` (default is to seed). The `README.md` production checklist says to override these via env vars and set `SEED_DEFAULT_USERS=0`.

**Seeding only runs when the users table is empty.** `lib/persistence/seed.ts:203`: `if (userCount === 0 && seedDefaultUsers)`. Setting `ADMIN_PASSWORD` later does NOT change existing accounts — the seed block is skipped entirely if any user already exists.

### 8.3 SESSION_SECRET enforcement

**ENFORCED in production, falls back to unsigned in development.**

In `lib/modules/mod-01-auth/session.ts`:
- `sign()`: If `SESSION_SECRET` is not set and `isProduction` is true → calls `failClosed()` which throws an error. In development, it logs a `console.warn` and returns the payload unsigned.
- `unsign()`: If `SESSION_SECRET` is not set and `isProduction` is true → returns `null` (rejects the session). In development, it returns the raw payload.

So in production, a missing `SESSION_SECRET` will cause login to fail (not silently fall back).

### 8.4 Schedule status transitions

See the table in Section 4 above. Source: `lib/modules/mod-03-schedule-engine/service.ts`, `ALLOWED_TRANSITIONS` constant.

### 8.5 No delete feature exists for faculty, rooms, sections, students, subjects or buildings

**KNOWN GAP: There is no delete API or UI for any master data entity.** The admin API (`app/api/admin/route.ts`) only has `delete-schedule` — no `delete-faculty`, `delete-room`, `delete-section`, `delete-student`, `delete-subject`, or `delete-building` actions exist. The master list page (`app/admin/master-list/page.tsx`) has no delete buttons. There is also no update/edit functionality for master data — only create and read.

**If a delete were attempted directly on the database**, the foreign key constraint would block it: `schedules` table has `NOT NULL REFERENCES` on `faculty_id`, `room_id`, `section_id` with `PRAGMA foreign_keys = ON` and no `ON DELETE CASCADE` or `ON DELETE SET NULL`. The default SQLite behavior is `NO ACTION` — the DELETE would throw an FK error.

**Implication:** There is currently no way to delete or edit faculty, rooms, sections, students, subjects, or buildings through the application. This is a significant gap — if an entity needs to be removed or corrected, it requires manual database intervention.

### 8.6 Admin UI for institutional facts

**Code-only — no admin UI for managing institutional facts.**

`app/admin/evidence/page.tsx` is a read-only dashboard that displays facts from the database. It has no create/edit/delete functionality. The facts are seeded from `lib/evidence/institutional-facts.ts` via `lib/persistence/seed.ts` (`ensureEvidenceSeeded()`). To add or modify facts, you must edit the source file and re-seed.

### 8.7 Faculty role — availability grid exposure

**Faculty CANNOT view the availability grid.** The availability grid is only accessible at `/admin/faculty-availability` (admin-only). The faculty API (`app/api/faculty/route.ts`) only returns the logged-in faculty's own profile and schedules — it does not expose `getFacultyAvailability`, `getFacultyList`, or any other faculty's data. The faculty dashboard and schedule pages only show own data.

### 8.8 User-guide vs user-guidelines

**Both exist and are separate pages:**
- `/user-guide` → `app/user-guide/page.tsx` — renders `docs/USER_GUIDE.md` (61,657 chars). Comprehensive user guide with all features, roles, and workflows.
- `/user-guidelines` → `app/user-guidelines/page.tsx` — separate page (5,430 chars) with role-based access instructions and usage guidelines.

Both are current and linked from the landing page footer at `app/page.tsx:448-449`.

### 8.9 Seed behavior — passwords are NOT overwritten

**Seeding only inserts when NO users exist. Setting `ADMIN_PASSWORD` in Render will NOT change an existing admin's password.**

In `lib/persistence/seed.ts`:
- L201: `const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;`
- L203: `if (userCount === 0 && seedDefaultUsers) {`
- L210: `createUser({ username: 'admin', password: getEnvPassword('ADMIN_PASSWORD', 'admin123'), role: 'admin' });`

The `userCount === 0` guard means if any user already exists in the database, the seed block is skipped entirely. On Render with a persistent disk, the first deploy seeds the users. Subsequent deploys with a different `ADMIN_PASSWORD` env var will NOT change the password — the existing hash remains.

### 8.10 No change-password or reset-password code path exists

**There is no change-password, reset-password, or update-password functionality anywhere in the codebase.** No UI, no API endpoint, no script. Searched all `.ts`, `.tsx`, `.js`, `.jsx` files for `change-password`, `changePassword`, `reset-password`, `resetPassword`, `updatePassword`, `update-password` — zero matches.

**Safe ways to rotate passwords (exact steps, do not run):**

1. **Direct SQL hash UPDATE on the persistent disk** (recommended for one-off rotation):
   - Access the Render instance shell or download the SQLite file from the persistent disk
   - Generate a new bcrypt hash using the same cost as the application: `bcrypt.hashSync('newpassword', 10)` (the app uses `SALT_ROUNDS = 10` at `lib/modules/mod-01-auth/service.ts:5`)
   - Run: `UPDATE users SET password_hash = '<new_bcrypt_hash>' WHERE username = 'admin';`
   - This keeps the `users.id` unchanged, so all references remain intact
   - No need to delete and recreate the user

2. **Nuclear option** (if you can afford to lose all data):
   - Set `SEED_DEFAULT_USERS=0` in Render
   - Delete the SQLite file from the persistent disk
   - Redeploy — the DB will re-seed with the new env var passwords
   - WARNING: This destroys all schedules, master data, and audit logs

**FK references to users.id:** No formal FOREIGN KEY constraints reference `users.id`. The `audit_logs.user_id` column is a nullable INTEGER with no FK constraint (`lib/persistence/db.ts:177`). The `schedules.approved_by` column is TEXT, not a FK (`lib/persistence/db.ts:322`). A hash UPDATE that keeps the id is safe — no FK constraints will be violated.

**Render access needed:** Shell access to the Render instance (via Render Dashboard → Shell) or the ability to download the SQLite file from the persistent disk. No database-specific access is needed — just file system access to `/data/csms-data/csms.db`.

### 8.11 Account creation — faculty and student logins

**YES — creating a faculty or student via the master list ALSO creates a `users` row.**

**Faculty creation** (`app/api/admin/route.ts:202-207`):
- Username: `data.employee_id.toLowerCase()` (e.g., `fac-001`)
- Password: `password || 'faculty123'` — uses the optional `password` field from the request, or falls back to `faculty123`
- Role: `faculty`, linked via `faculty_id`

**Student creation** (`app/api/admin/route.ts:225-230`):
- Username: `data.student_id` (e.g., `2025-0001`)
- Password: `password || 'student123'` — uses the optional `password` field from the request, or falls back to `student123`
- Role: `student`, linked via `student_id`

**Implication:** `faculty123` and `student123` are NOT the only faculty/student logins. Each account created through the master list gets its own username and password. The seed defaults (`faculty123`, `student123`) are only used during initial seeding when no `FACULTY_PASSWORD`/`STUDENT_PASSWORD` env vars are set.

---

## 9. Known Gaps (priority order)

| # | Gap | Impact | Effort to Fix |
|---|-----|--------|---------------|
| 1 | **No password change or reset** | Admin cannot rotate passwords without direct SQL or nuclear reseed. Default passwords may persist if env vars are not set before first deploy. | Medium — requires new API route + UI |
| 2 | **Default passwords may persist** | If `ADMIN_PASSWORD` etc. are not set in Render before first deploy, the seed defaults (`admin123`, `faculty123`, `student123`) remain active. | Low — set env vars in Render dashboard |
| 3 | **No edit or delete for master data** | Cannot correct typos in faculty names, room codes, section codes, etc. Cannot remove obsolete entities. | Medium — requires new API routes + UI |
| 4 | **No bulk import** | Onboarding 100+ students requires individual form submissions. | Medium — requires CSV/Excel import feature |
| 5 | **Only login is rate limited** | Admin, faculty, and student API endpoints have no rate limiting. | Low — add middleware or per-route limits |
| 6 | **Hardcoded landing stats** | Public landing page shows placeholder numbers (4, 12, 38, 156) that may not reflect reality. **Decision pending, recommend removal (Option B).** | Low — remove section or convert to server component |
| 7 | **No backup cron** | Backups must be triggered manually. No automated retention policy. | Low — add cron job or Render scheduled task |
| 8 | **No self-service password change** | All three roles (admin, faculty, student) must use direct SQL to change passwords. No UI or API exists. | Medium — see proposal below |
| 9 | **No must_change_password flag** | Seeded accounts with default passwords are not forced to change them on first login. | Low — add boolean column + middleware check |

---

## 10. Change-Password Proposal (all three roles)

**Route:** `POST /api/auth/change-password`

**Request body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Validation:**
- `currentPassword` must match the logged-in user's current hash (via `verifyPassword()`)
- `newPassword` must be ≥ 8 characters
- `newPassword` must not equal `currentPassword`
- Rate limited: 5 attempts per 15 minutes per IP (same as login)

**Response:**
- Success: `{ success: true }` — session cookie is NOT invalidated (existing sessions stay valid up to 8h)
- Failure: 401 with error message

**Audit:** Log `action: "CHANGE_PASSWORD"`, `entity_type: "user"`, `entity_id: <userId>` via `logAudit()`

**UI:** Add a "Change Password" section to each role's settings/profile page:
- Admin: `/admin/settings/page.tsx`
- Faculty: `/faculty/dashboard/page.tsx` (or a new settings page)
- Student: `/student/dashboard/page.tsx` (or a new settings page)

**Session behavior:** The session cookie is NOT invalidated after a password change. Existing sessions stay valid for up to 8 hours (the current `maxAge`). This is intentional — it prevents accidental lockout if the user has multiple tabs open. If immediate invalidation is desired, call `clearSession()` after the password update and return a flag to redirect to login.

**must_change_password flag:**
- Add a `must_change_password` column to the `users` table (INTEGER, default 0)
- Set to 1 for all seeded users during initial seed
- Middleware checks this flag on login: if set, redirect to a "Change Password" page instead of the dashboard
- After successful password change, set `must_change_password` to 0
- This forces all seeded accounts to change their default passwords on first login

**bcrypt package:** The app imports `bcryptjs` (not `bcrypt`) — see `package.json` dependencies. The hash function is `bcrypt.hashSync(password, 10)` at `lib/modules/mod-01-auth/service.ts:8`.

---

## 11. Password Rotation Steps (revised)

**Prerequisites:**
- Render Shell access: NOT VERIFIED, owner must check the plan. Render free tier may not include Shell access. If Shell is not available, download the SQLite file from the persistent disk via Render's dashboard or API.
- The app uses `bcryptjs` (not `bcrypt`) — see `package.json`

**Steps (do not run):**

1. **Generate a new bcrypt hash** (same cost as the app):
   ```bash
   node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync(process.env.NEW_ADMIN_PASSWORD, 10));"
   ```
   The password is passed through the `NEW_ADMIN_PASSWORD` env var, not typed inline.

2. **WAL checkpoint** (ensure all writes are flushed to the main DB file):
   ```bash
   sqlite3 /data/csms-data/csms.db "PRAGMA wal_checkpoint(TRUNCATE);"
   ```

3. **Update the password hash** (keeps the `users.id` unchanged):
   ```bash
   sqlite3 /data/csms-data/csms.db "UPDATE users SET password_hash = '<hash_from_step_1>' WHERE username = 'admin';"
   ```

4. **Verify the update:**
   ```bash
   sqlite3 /data/csms-data/csms.db "SELECT username, substr(password_hash, 1, 20) FROM users WHERE username = 'admin';"
   ```

5. **Test login** with the new password.

**Session validity:** Existing sessions stay valid up to 8 hours (the current cookie `maxAge`). Users do not need to log in again immediately. If immediate invalidation is desired, restart the Render service after the update.

**FK safety:** No formal FOREIGN KEY constraints reference `users.id`. The `audit_logs.user_id` column is a nullable INTEGER with no FK constraint. The `schedules.approved_by` column is TEXT, not a FK. A hash UPDATE that keeps the id is safe.

---

## 12. ASSUMPTIONS (inferred, not directly stated in code)

- The "4 Academic Departments", "12 Active Faculty", "38 Courses", "156 Class Sections" on the landing page are hardcoded marketing numbers in `app/page.tsx`, not pulled from the database. ASSUMPTION: These are aspirational/placeholder figures.
- The system is designed for a single department (BSIT), not institution-wide. ASSUMPTION: Other departments would need separate deployment or multi-tenant support.
- No email/SMS notifications — ASSUMPTION: Users must actively check the portal for schedule changes.
- No enrollment/grading/attendance features — explicitly out of scope per `README.md`.
- The evidence/institutional facts system is a differentiator for capstone defense — ASSUMPTION: This is a requirement from the capstone spec, not a user-facing feature per se.
- The app is not optimized for slow/unstable connections beyond standard browser caching. ASSUMPTION: No service worker or offline cache is planned.
- "Previously done manually" in Section 1 — ASSUMPTION: I inferred this from the problem statement; the user did not explicitly state this.
- "Why this matters at TRAC BSIT" in Section 5 — ASSUMPTION: I wrote this based on the problem description; the user provided the topic but not the exact wording.

---

## 13. OPEN QUESTIONS (could not determine from code)

1. **Is there a staging environment?** Only Render production and Vercel preview are documented. Is there a separate staging URL?
2. **How are passwords reset?** No "forgot password" flow found. Is this handled manually by admin via Master List? (See 11 for safe rotation steps.)
3. **Is there a bulk import feature?** Only individual CRUD operations found. How do you onboard 100+ students at once?
4. **What's the backup retention automation?** `docs/BACKUP.md` mentions "cron or manual cleanup" but no cron job is configured in the codebase.
5. **Are there API rate limits on other endpoints?** Only login has rate limiting. Are admin/student/faculty endpoints unthrottled?
6. **Are there any known bugs or technical debt items not tracked in issues?**
7. **What's the plan for multi-semester support?** The schema supports it, but the UI seems focused on the active semester only.
8. **How should the hardcoded landing page stats be handled?** Should they be replaced with real DB counts, or are they intentionally static for the capstone demo?
9. **Why is there no delete functionality for faculty/room/section?** Is this intentional (entities are meant to be permanent) or a gap to be filled?
10. **Render environment variables:** CANNOT VERIFY from code, owner must check Render environment. `ADMIN_PASSWORD`, `FACULTY_PASSWORD`, `STUDENT_PASSWORD`, and `SEED_DEFAULT_USERS` are NOT in `render.yaml` — they must be set in Render's dashboard or the defaults will be used.
11. **Render Shell availability:** NOT VERIFIED, owner must check the plan. Free tier may not include Shell access.

---

## 14. Change Control Rules

- **Show file content before committing.** Always display the full content of any file to be committed before staging.
- **Do not push until approved.** No `git push` without explicit user approval.
- **Read this file first.** At the start of every session and before any change, re-read this document.
- **Flag conflicts.** If a requested change conflicts with the purpose, roles, or critical parts described here, flag it before proceeding.
