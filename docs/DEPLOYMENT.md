# Deployment Guide

## Option A — Render (recommended for persistent SQLite)

This app should run on Render as a **Node web service**. Do not deploy it as a static site.

### Prerequisites
- GitHub repo connected to Render
- Render account with ability to create Web Services and Disks

### Create Web Service
- Name: `csms-trac-bsit`
- Runtime: Node
- Plan: Free or Starter
- Region: Singapore if available; otherwise nearest region
- Branch: main
- Auto-Deploy: enabled

### Disk
- Name: `csms-data`
- Mount Path: `/data`
- Size: `1 GB`

### Environment Variables
| Key | Value |
|---|---|
| `CSMS_DATA_DIR` | `/data/csms-data` |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | 32+ byte random string |
| `CSMS_ALLOW_UNSIGNED` | `0` in production |

> Supabase/Postgres environment variables are not required for the current SQLite architecture. Add them only after the persistence layer is migrated away from `better-sqlite3`.

### Build & Start
- Build Command: `npm run build`
- Start Command: `npm start`
- Node Version: 20.x or 22.x

### Notes
- First request auto-seeds the SQLite database under `/data/csms-data/csms.db`
- Free tier spins down after inactivity; use Starter for always-on demo
- If `better-sqlite3` fails to build, use a Debian-based Node image or add buildpack apt steps

### Post-Deploy Checks
- App loads on `*.onrender.com`
- Login works for admin/faculty/student
- Database file persists after redeploy
- Backup endpoint creates `.db` files under `/data/csms-data/backups/`

---

## Option B — Vercel (preview/demo only)

### Notes
- Fastest deploy path
- SQLite is stored in `/tmp` and is ephemeral
- Data can reset between deploys or cold starts
- Suitable for preview URLs and time-boxed demos only
- Render service configuration (disk mounts and Render blueprint settings) does not apply to Vercel deployments

### Setup
- Build Command: `npm run build`
- Output: `.next`
- Env vars: set `NODE_ENV=production` and `SESSION_SECRET`; omit Render-specific disk variables such as `CSMS_DATA_DIR`

### Caveats
- Do not use for persistent capstone demo unless paired with Vercel KV/Blob
- If persistent demo is required, use Render instead

---

## Option C — Supabase/Postgres (future migration)

### When to Use
- After capstone demo or if concurrent load exceeds SQLite limits
- Requires schema/query migration from `better-sqlite3` to Prisma/Drizzle

### Steps
1. Create Supabase project
2. Add `DATABASE_URL` to deployment environment
3. Migrate schema and rewrite `lib/persistence/*` for Postgres
4. Update backup strategy to `pg_dump` or managed restore
