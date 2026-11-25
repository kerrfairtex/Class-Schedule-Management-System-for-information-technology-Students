/**
 * MOD-10 Announcements shown on the public site between starts_on and
 * ends_on (inclusive). Bodies are plain text; the UI never renders them as
 * HTML, so an announcement cannot inject markup.
 */
import { getDb } from '@/lib/persistence/db';
import { logAudit } from '@/lib/modules/mod-08-database-service/audit';
import { DomainError } from '@/lib/modules/mod-02-master-list/validation';

export interface Announcement {
  id: number;
  title: string;
  body: string;
  starts_on: string;
  ends_on: string | null;
  pinned: number;
  updated_at: string;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  starts_on: string;
  ends_on?: string | null;
  pinned?: boolean;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COLUMNS = 'id, title, body, starts_on, ends_on, pinned, updated_at';

function validate(input: AnnouncementInput) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > 160) throw new DomainError('Give the announcement a title (up to 160 characters).');
  if (!body || body.length > 4000) throw new DomainError('Write the announcement (up to 4,000 characters).');
  if (!DATE.test(input.starts_on)) throw new DomainError('Choose the date it starts showing.');
  const ends = input.ends_on || null;
  if (ends && !DATE.test(ends)) throw new DomainError('The end date must be YYYY-MM-DD.');
  if (ends && ends < input.starts_on) throw new DomainError('The end date must be on or after the start date.');
  return { title, body, starts_on: input.starts_on, ends_on: ends, pinned: input.pinned ? 1 : 0 };
}

/** Everything, newest first (admin list). */
export async function listAnnouncements(): Promise<Announcement[]> {
  const db = await getDb();
  return (await db
    .prepare(`SELECT ${COLUMNS} FROM announcements ORDER BY starts_on DESC, id DESC`)
    .all()) as Announcement[];
}

/** What the public sees on `today` (campus date): pinned first, then newest. */
export async function listCurrentAnnouncements(today: string, limit = 20): Promise<Announcement[]> {
  const db = await getDb();
  return (await db
    .prepare(
      `SELECT ${COLUMNS} FROM announcements
       WHERE starts_on <= ? AND (ends_on IS NULL OR ends_on >= ?)
       ORDER BY pinned DESC, starts_on DESC, id DESC LIMIT ?`
    )
    .all(today, today, limit)) as Announcement[];
}

export async function createAnnouncement(input: AnnouncementInput, userId?: number): Promise<number> {
  const a = validate(input);
  const db = await getDb();
  const r = await db
    .prepare(
      `INSERT INTO announcements (title, body, starts_on, ends_on, pinned, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(a.title, a.body, a.starts_on, a.ends_on, a.pinned, userId ?? null);
  const id = Number(r.lastInsertRowid ?? r.lastID);
  await logAudit(userId ?? null, 'CREATE', 'announcement', id, a.title);
  return id;
}

export async function updateAnnouncement(id: number, input: AnnouncementInput, userId?: number): Promise<void> {
  const a = validate(input);
  const db = await getDb();
  const r = await db
    .prepare(
      `UPDATE announcements SET title = ?, body = ?, starts_on = ?, ends_on = ?, pinned = ?,
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .run(a.title, a.body, a.starts_on, a.ends_on, a.pinned, id);
  if (!r.changes) throw new DomainError('That announcement no longer exists.');
  await logAudit(userId ?? null, 'UPDATE', 'announcement', id, a.title);
}

export async function deleteAnnouncement(id: number, userId?: number): Promise<void> {
  const db = await getDb();
  const r = await db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  if (!r.changes) throw new DomainError('That announcement no longer exists.');
  await logAudit(userId ?? null, 'DELETE', 'announcement', id);
}
