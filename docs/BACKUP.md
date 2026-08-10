# Backup and Retention Strategy

## Automated Backup
- Use existing `POST /api/admin` action `backup`
- Produces timestamped SQLite backup under:
  - Local/default: `data/backups/csms-backup-<timestamp>.db`
  - Render/production: `/data/csms-data/backups/csms-backup-<timestamp>.db`

## Manual Backup
- Admin can trigger backup from Master List page:
  - Button: `Backup Database (MOD-08)`
  - Response includes `path` to backup file

## Retention Policy
- Keep last 7 days of backups
- Older files should be removed by cron or manual cleanup
- Example cleanup command:
  - Linux: `find /data/csms-data/backups -type f -mtime +7 -delete`

## Restore Procedure
1. Stop app or ensure no active writes
2. Copy desired `.db` backup over `csms.db`
3. Optionally run integrity check:
   - SQLite CLI: `sqlite3 /data/csms-data/csms.db "PRAGMA integrity_check;"`
4. Restart app

## Notes
- SQLite backup is file-based; ensure disk space on `/data`
- For PostgreSQL migration, replace with `pg_dump` and provider-managed restore
