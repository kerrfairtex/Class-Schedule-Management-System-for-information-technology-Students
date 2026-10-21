import fs from 'fs';
import path from 'path';
import { backupDatabase, getDbPath, getDataDir, isPostgres, getDb } from '@/lib/persistence/db';

/**
 * Create a backup of the active database.
 *
 * On SQLite the backup is a file copy of csms.db.
 * On PostgreSQL a file copy is impossible, so this produces a logical export
 * (schema DDL + table data as JSON) instead. The previous implementation
 * called backupDatabase() unconditionally, which on PostgreSQL tried to copy
 * '<cwd>/data/csms.db' to a path derived from the DATABASE_URL and failed with
 * a raw ENOENT/copyfile error.
 */
export async function createBackup(): Promise<string> {
  const db = await getDb();

  if (isPostgres(db)) {
    return createPostgresExport(db);
  }

  const dbPath = getDbPath();
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `csms-backup-${timestamp}.db`);
  backupDatabase(backupPath);
  return backupPath;
}

/** Logical export of every table in the `csms` schema. */
async function createPostgresExport(db: any): Promise<string> {
  const backupDir = path.join(getDataDir(), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `csms-backup-${timestamp}.json`);

  const tableRows = await db
    .prepare(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'csms' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    )
    .all();

  const tables: Record<string, unknown[]> = {};
  for (const row of tableRows as { table_name: string }[]) {
    // Table names come from information_schema, not user input, but quote them
    // anyway so an odd name cannot break the query.
    const quoted = '"' + row.table_name.replace(/"/g, '""') + '"';
    const data = await db.prepare(`SELECT * FROM csms.${quoted}`).all();
    tables[row.table_name] = data;
  }

  const payload = {
    format: 'csms-logical-export',
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    schema: 'csms',
    tableCount: tableRows.length,
    tables,
  };

  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2), 'utf-8');
  return backupPath;
}

export function listBackups(): string[] {
  const backupDir = path.join(getDataDir(), 'backups');
  if (!fs.existsSync(backupDir)) return [];
  return fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith('.db') || f.endsWith('.json'))
    .sort()
    .reverse();
}

/**
 * Resolve a backup file name to its absolute path.
 *
 * The name comes from the client, so it is validated: it must be a plain
 * file name (no path separators, no '..') and it must resolve inside the
 * backups directory. This prevents a path traversal read of the container.
 */
export function resolveBackupPath(fileName: string): string | null {
  if (!fileName) return null;
  if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(fileName)) return null;

  const backupDir = path.join(getDataDir(), 'backups');
  const resolved = path.resolve(backupDir, fileName);
  // Defence in depth: the resolved path must still be inside backupDir.
  if (resolved !== backupDir && !resolved.startsWith(backupDir + path.sep)) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}
