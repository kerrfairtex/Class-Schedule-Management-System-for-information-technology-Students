# Deployment Guide

Production runs as a **Render web service** (Node 20) that auto-deploys the `main`
branch, backed by **PostgreSQL on Supabase**.

> **The Supabase project is a shared database.** Other apps use it too. CSMS owns only
> the `csms` schema. The app checks at startup that its active schema is `csms` and
> refuses to serve otherwise. Never run DDL, `DROP`, `TRUNCATE` or bulk `DELETE`
> outside `csms`, and never point a local run, test or seed at it.

## 1. Render web service

Render dashboard → the CSMS web service → **Settings**. These values are the source of
truth; `render.yaml` in the repo is outdated (it describes a Render-hosted database and
an SQLite disk, neither of which is used).

| Setting | Value |
|---|---|
| Runtime | Node 20 |
| Branch | `main` (auto-deploy on) |
| Build command | `npm install; npm run build` |
| Start command | `node .next/standalone/server.js` |
| Health check path | `/api/health` |

Do **not** set `PORT`; Render provides it. Do **not** put
`scripts/sync-demo-passwords.cjs` in the start command: it is for demo setups only and
does nothing in production unless `CSMS_SYNC_DEMO_PASSWORDS=1`.

### Environment variables (Render → Environment)

| Name | Value |
|---|---|
| `DATABASE_URL` | Supabase **session pooler** URL (port 5432), `sslmode=require` |
| `SESSION_SECRET` | 32+ random characters; changing it signs everyone out |
| `NODE_ENV` | `production` |
| `SITE_URL` | Optional; set when the app moves to its own domain |
| `PG_POOL_MAX` | Optional; default 5. Keep it low: the database is shared |

Never set `CSMS_ALLOW_PRODUCTION_WRITES`, `CSMS_SYNC_DEMO_PASSWORDS` or
`CSMS_DISABLE_MUST_CHANGE_PASSWORD` in production.

## 2. Database changes (migrations)

The app never changes the database schema on startup. Schema changes are numbered,
additive, idempotent SQL files in `db/migrations/`, each with a `.down.sql` rollback.

1. **Read the migration.** It must touch only the `csms` schema.
2. **Back up**: Supabase dashboard → Database → Backups, or
   `pg_dump --schema=csms --format=custom -f csms-YYYYMMDD.dump "$DATABASE_URL"`.
3. **Run it** as `postgres` in the Supabase SQL editor (paste the file) or with `psql`.
4. **Check** that it finished with `COMMIT`. Each migration runs in one transaction, so
   a failure changes nothing.

Run a migration **before** merging code that depends on it. Migrations are written to
be safe on the current production schema.

## 3. Deploy

1. Run `bash scripts/verify.sh` locally (lint, tests, build, typecheck, secrets).
2. Merge the pull request into `main`. Render builds and deploys automatically.
   (GitHub Actions and the Vercel check are not part of this pipeline; see the PR for
   local verification results.)
3. Watch the deploy in the Render dashboard until it is **Live**.

### Post-deploy checks

- `GET /api/health` returns `200` with `"database":"up"`.
- `/` loads; the "Class Sections Scheduled" count matches published, non-DEMO classes.
- Log in as an admin; open `/admin/schedule-board`; the board loads.
- Response headers include `Content-Security-Policy` and `Strict-Transport-Security`.
- `/robots.txt` and `/sitemap.xml` respond.

## 4. Rollback

**Code:** Render dashboard → the service → **Events** → pick the last good deploy →
**Rollback**. Then `git revert` the bad merge on `main` so the next auto-deploy does not
bring it back.

**Database:** run the matching `db/migrations/NNN_*.down.sql` as `postgres`. Down
files remove only what their migration added and never drop data columns. If data was
damaged, restore the `csms` schema from the backup taken in step 2.2:
`pg_restore --schema=csms --clean --if-exists -d "$DATABASE_URL" csms-YYYYMMDD.dump`
(this replaces only `csms` objects; review before running on the shared database).

## 5. Local development

See the README: keep `DATABASE_URL` empty and use `npm run seed` for a local SQLite
database. Never copy the production `DATABASE_URL` into a local `.env`.
