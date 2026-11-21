# Changelog

## Unreleased

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
