import fs from 'fs';
import path from 'path';
import { getDbPath } from '@/lib/persistence/db';

export function createBackup(): string {
  const dbPath = getDbPath();
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `csms-backup-${timestamp}.db`);
  fs.copyFileSync(dbPath, backupPath);
  return backupPath;
}

export function listBackups(): string[] {
  const backupDir = path.join(path.dirname(getDbPath()), 'backups');
  if (!fs.existsSync(backupDir)) return [];
  return fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith('.db'))
    .sort()
    .reverse();
}
