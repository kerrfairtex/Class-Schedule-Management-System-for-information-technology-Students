# SECURITY_ROADMAP_DRAFT.md — CSMS Password Feature

> **PROPOSED, NOT IMPLEMENTED.** This document contains proposals and a gated implementation plan. No code has been written. No phase starts until the previous one is runtime-verified in a real browser.

---

## 0. Rate Limit Analysis (VERIFIED)

**File:** `app/api/auth/login/route.ts`

**Rate limit key:** `X-Forwarded-For` header (first IP in the comma-separated list), falling back to `X-Real-IP`, then `'unknown'`.

**Evidence:**
- L16-22: `getClientIP()` reads `x-forwarded-for` first, then `x-real-ip`, then returns `'unknown'`
- L12: `const rateLimitStore = new Map<string, { count: number; resetAt: number }>()` — in-memory, resets on restart
- L13-14: 15-minute window, 5 attempts max

**All users behind Render's proxy share one bucket.** Render's proxy forwards all requests from the same egress IP, so `X-Forwarded-For` will be the same for all users. This means:
- 5 failed login attempts from any user locks out ALL users for 15 minutes
- A single brute-force attempt from one user consumes the budget for everyone
- The rate limit is per-IP, not per-username

**Implication:** The current rate limit is ineffective on Render. A better approach would be per-username rate limiting, or using Render's built-in rate limiting.

---

## 1. PROPOSAL: Change-Password Feature (all three roles)

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

## 2. PROPOSAL: Password Rotation Steps

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

## 3. Gated Implementation Plan: Password Feature

**Rules:**
- No phase starts until the previous one is runtime-verified in a real browser.
- Each phase must be tested locally first, then on the live URL.
- All migrations must be safe on a live persistent disk (no data loss).

### Phase 1: must_change_password column + login flow

**Files to modify:**
- `lib/persistence/db.ts` — add `must_change_password` column to `users` table in `initSchema()` and in the migration `alterStatements` array
- `lib/persistence/seed.ts` — set `must_change_password = 1` for all seeded users
- `lib/modules/mod-01-auth/session.ts` — include `mustChangePassword` in `SessionUser` type
- `lib/modules/mod-01-auth/service.ts` — include `must_change_password` in `toSessionUser()` return
- `middleware.ts` — check `mustChangePassword` flag: if set, redirect to `/change-password` instead of the dashboard
- `app/change-password/page.tsx` — new page with a "Set New Password" form (no current password required, since this is first login)
- `app/api/auth/change-password/route.ts` — new route for first-time password change (no current password check, just new password)

**Migration (safe on live disk):**
```sql
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
```
Then update existing seeded users:
```sql
UPDATE users SET must_change_password = 1 WHERE username IN ('admin', 'fac-001', 'fac-002', 'fac-003', '2022-0001', '2023-0001');
```
This is safe — it only adds a column and updates a flag. No data is lost.

**Creation-time behavior:** For all future account creations, `must_change_password` is set to 1 at creation time when no admin-typed password is provided:
- **Seed** (`lib/persistence/seed.ts`): All seeded users get `must_change_password = 1`
- **Faculty creation** (`app/api/admin/route.ts:202-207`): If `password` field is empty/not provided, set `must_change_password = 1`
- **Student creation** (`app/api/admin/route.ts:225-230`): If `password` field is empty/not provided, set `must_change_password = 1`
- If the admin provides a password at creation time, `must_change_password = 0` (no forced change)

**Testing:**
1. Local: `npm run dev` → log in as `admin`/`admin123` → should redirect to `/change-password` → set new password → should redirect to `/admin/dashboard` → log out → log in with new password → should work
2. Live: Same steps on the production URL

**Rollback:** Restore the pre-migration backup. Before running the migration, trigger a backup via `POST /api/admin` with `action: "backup"`. If anything goes wrong, stop the app, restore the backup file over `csms.db`, and restart.

**Lockout guard:** Before forcing any password changes, create a second admin account and verify it can log in. This ensures you are not locked out if the primary admin account has issues. Steps:
1. Log in as admin
2. Create a second admin user via direct SQL: `INSERT INTO users (username, password_hash, role, is_active) VALUES ('admin2', '<bcrypt_hash>', 'admin', 1);`
3. Log out, then log in as `admin2` with the new password
4. Verify `admin2` can access `/admin/dashboard`
5. Only then proceed with forced password changes

**Gate:** Phase 1 is done when a seeded user is forced to change password on first login and can then log in normally.

### Phase 2: Self-service change-password API and UI

**Files to modify:**
- `app/api/auth/change-password/route.ts` — extend to accept `currentPassword` for logged-in users (not just first-time)
- `app/change-password/page.tsx` — add "Change Password" section for logged-in users (with current password field)
- `app/admin/settings/page.tsx` — add link to change password
- `app/faculty/dashboard/page.tsx` — add link to change password
- `app/student/dashboard/page.tsx` — add link to change password
- `lib/modules/mod-08-database-service/audit.ts` — log `CHANGE_PASSWORD` action

**Migration:** None needed — the `must_change_password` column already exists from Phase 1.

**Testing:**
1. Local: Log in → go to change password → enter wrong current password → should fail → enter correct current password + new password → should succeed → log out → log in with new password → should work
2. Live: Same steps on the production URL

**Gate:** Phase 2 is done when any logged-in user can change their own password and the old password no longer works.

### Phase 3: Random initial passwords and admin reset

**Files to modify:**
- `lib/persistence/seed.ts` — generate random passwords for seeded users (using `crypto.randomBytes`)
- `app/api/admin/route.ts` — add `action: "reset-password"` to generate a new random password for a user and return it (one-time display)
- `app/admin/master-list/page.tsx` — add "Reset Password" button next to each user
- `lib/modules/mod-01-auth/service.ts` — add `generateRandomPassword()` function

**Migration:** None needed.

**Testing:**
1. Local: Log in as admin → go to master list → click "Reset Password" on a user → should display a new random password → log in as that user with the new password → should work → log in as that user with the old password → should fail
2. Live: Same steps on the production URL

**Gate:** Phase 3 is done when an admin can reset any user's password and the new password works immediately.


---

## 4. Migration Design (Phase 1)

**Flag existing users with default passwords:**

Before adding the `must_change_password` column, identify all users whose bcrypt hash matches the default passwords. This is done by comparing hashes, not by username:

```sql
-- Step 1: Add the column with safe default
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;

-- Step 2: Flag users whose hash matches admin123
UPDATE users SET must_change_password = 1 WHERE password_hash = '$2a$10$<hash_of_admin123>';

-- Step 3: Flag users whose hash matches faculty123
UPDATE users SET must_change_password = 1 WHERE password_hash = '$2a$10$<hash_of_faculty123>';

-- Step 4: Flag users whose hash matches student123
UPDATE users SET must_change_password = 1 WHERE password_hash = '$2a$10$<hash_of_student123>';
```

The exact bcrypt hashes are generated at runtime using `bcrypt.hashSync('admin123', 10)` etc. The migration script should:
1. Generate the three default hashes
2. Add the column
3. Update all matching users
4. Also flag all admin-created accounts (those created via `app/api/admin/route.ts` without an admin-typed password)

**Env var to disable enforcement:**

Add `CSMS_DISABLE_MUST_CHANGE_PASSWORD=1` to Render environment variables. When set:
- The middleware check for `mustChangePassword` is skipped
- Users are not forced to change their password on login
- This is an emergency escape hatch

**Emergency reset script (design only):**

A script `scripts/reset-passwords.ts` that:
1. Reads a JSON file with username → new password mappings
2. Generates bcrypt hashes for each new password
3. Updates the `users` table
4. Sets `must_change_password = 1` for each reset user
5. Logs the action to `audit_logs`

Usage: `npx tsx scripts/reset-passwords.ts passwords.json`

The script should:
- Validate new passwords meet minimum length (8 chars)
- Not log the actual passwords
- Require explicit confirmation before running
- Be runnable from Render Shell or locally with the SQLite file

---

## 5. Phase 0 Runbook: Backup and Restore Proof

**Goal:** Prove you can backup and restore the database before touching anything.

### Step 0.1: Trigger a backup

**Action:** Log in as admin → POST `/api/admin` with `action: "backup"` → note the backup file path

**Prove it:** The response includes a `path` field. Verify the file exists on the persistent disk:
```bash
ls -la /data/csms-data/backups/
```

### Step 0.2: Copy the backup off-server

**Action:** Download the backup file from Render to your local machine

**Prove it:** The file exists locally and has the same size as the server copy

### Step 0.3: Local restore proof

**Action:** 
1. Copy the backup file over a fresh SQLite database
2. Start the app locally with `CSMS_DATA_DIR=/tmp/csms-restore-test`
3. Verify the admin user exists and can log in

**Prove it:** Log in as admin with the current password → should work

### Step 0.4: Git tag

**Action:** Create a git tag before any changes:
```bash
git tag -a pre-password-migration -m "Backup before password feature migration"
git push origin pre-password-migration
```

**Prove it:** `git tag -l` shows the tag

### Rollback

If anything goes wrong:
1. Stop the app
2. Restore the backup file over `csms.db`
3. Restart the app
4. Verify admin login works

---

## 6. Phase 1 Runbook: Reseed with New Passwords

**Goal:** Wipe the database and reseed with strong passwords from env vars.

### Step 1.1: Set the 3 password env vars in Render

**Action:** In Render dashboard, set:
- `ADMIN_PASSWORD` = strong random string (32+ chars)
- `FACULTY_PASSWORD` = strong random string (32+ chars)
- `STUDENT_PASSWORD` = strong random string (32+ chars)
- `SEED_DEFAULT_USERS` = `1` (ensure seeding happens)

**Prove it:** Render shows the env vars are set (values not visible)

### Step 1.2: Delete the SQLite file

**Action:** Via Render Shell or by scaling the service to 0 and back to 1:
```bash
rm /data/csms-data/csms.db
```

**Prove it:** The file no longer exists

### Step 1.3: Redeploy

**Action:** Trigger a redeploy in Render (git push or manual deploy)

**Prove it:** The app starts and the database is reseeded

### Step 1.4: Verify new passwords work

**Action:** Log in as admin with the new `ADMIN_PASSWORD`

**Prove it:** 
- Old login (`admin`/`admin123`) → FAILS (401)
- New login (`admin`/`new_password`) → WORKS (redirect to dashboard)

### Step 1.5: Verify seeded accounts

**Action:** Log in as each seeded account:
- `fac-001` with `FACULTY_PASSWORD`
- `2022-0001` with `STUDENT_PASSWORD`

**Prove it:** Each login works with the env var password

### What data is lost

After deleting the SQLite file and reseeding:
- **Lost:** All schedules, all master data created after initial seed, all audit logs, all admin-created accounts
- **Kept:** Nothing — the database is completely reseeded
- **Recreated:** All seed data (departments, programs, buildings, rooms, subjects, curriculum, sections, faculty, students, users, evidence tables)

### What demo accounts exist after reseed

From `lib/persistence/seed.ts`:
- **Admin:** username `admin`, password from `ADMIN_PASSWORD` env var
- **Faculty:** usernames `fac-001`, `fac-002`, `fac-003` (from `employee_id.toLowerCase()`), password from `FACULTY_PASSWORD` env var
- **Students:** usernames `2022-0001`, `2023-0001` (from `student_id`), password from `STUDENT_PASSWORD` env var

**FACULTY_PASSWORD and STUDENT_PASSWORD apply to EVERY demo user** — all faculty share the same password, all students share the same password.

### Rollback

If the reseed fails:
1. Stop the app
2. Restore the Phase 0 backup over `csms.db`
3. Restart the app
4. Verify admin login works with the old password

---

## 7. Demo-Day Note: Avoiding Rate-Limit Lockout

**Problem:** The login rate limit is 5 attempts per 15 minutes per IP. On Render, all users share one bucket (same `X-Forwarded-For`). During a presentation, failed login attempts from the audience can lock everyone out.

**Solutions:**

1. **Use the `CSMS_DISABLE_MUST_CHANGE_PASSWORD=1` env var** — disables forced password changes but does NOT disable rate limiting

2. **Restart the Render service before the demo** — clears the in-memory rate limit counter

3. **Use a VPN or mobile hotspot** — gives you a different IP than the audience

4. **Pre-login before the demo** — log in as admin, faculty, and student before starting, so you have valid sessions

5. **Set `SEED_DEFAULT_USERS=0` after reseed** — prevents re-seeding on restart, but does NOT disable rate limiting

6. **For the demo only:** Temporarily increase `RATE_LIMIT_MAX` in `app/api/auth/login/route.ts` from 5 to 100, deploy, then revert

**Best approach:** Pre-login as all three roles before the demo, use a mobile hotspot for a separate IP, and restart the service to clear counters.

---

## 8. Public Pages Showing Default Passwords

| File | Passwords Shown | Context |
|------|-----------------|---------|
| `README.md` | `admin123`, `faculty123`, `student123`, `fac-001` | Demo credentials table |
| `docs/USER_GUIDE.md` | `faculty123`, `student123` | Test credentials section |
| `docs/UAT.md` | `admin123`, `faculty123`, `student123`, `fac-001`, `2022-0001` | UAT test credentials |

These are all in the repository and would be visible to anyone with repo access. After reseed with strong passwords, these docs should be updated to remove the default passwords.
