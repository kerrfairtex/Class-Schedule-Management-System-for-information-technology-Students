import fs from 'fs';
import os from 'os';
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
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `csms-backup-${timestamp}.json`;

  // The backup directory is created if missing. If CSMS_DATA_DIR points at a
  // path the process cannot write to (Render's free tier has no persistent
  // disk, so an arbitrary mount path is not writable), fall back to the OS
  // temp dir rather than failing the whole backup.
  let backupDir = path.join(getDataDir(), 'backups');
  let backupPath = path.join(backupDir, fileName);
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.accessSync(backupDir, fs.constants.W_OK);
  } catch {
    const fallbackDir = path.join(os.tmpdir(), 'csms-backups');
    fs.mkdirSync(fallbackDir, { recursive: true });
    backupDir = fallbackDir;
    backupPath = path.join(fallbackDir, fileName);
  }

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

/** Every directory a backup file can live in, most preferred first. */
function backupDirs(): string[] {
  return [path.join(getDataDir(), 'backups'), path.join(os.tmpdir(), 'csms-backups')];
}

/** Locate a backup file by name across every candidate directory. */
function findBackupFile(fileName: string): string | null {
  for (const dir of backupDirs()) {
    const candidate = path.join(dir, fileName);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function listBackups(): string[] {
  const seen = new Set<string>();
  for (const dir of backupDirs()) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.db') || f.endsWith('.json')) seen.add(f);
    }
  }
  return [...seen].sort().reverse();
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

  const found = findBackupFile(fileName);
  if (!found) return null;
  // Defence in depth: the resolved path must still be inside a backup dir.
  for (const dir of backupDirs()) {
    const root = path.resolve(dir);
    const resolved = path.resolve(found);
    if (resolved === root || resolved.startsWith(root + path.sep)) return resolved;
  }
  return null;
}
