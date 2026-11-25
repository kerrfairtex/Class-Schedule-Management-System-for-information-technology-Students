import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb, destroyTestDb, type TestFixtures } from '@/lib/persistence/test-db';
import {
  createSchedule,
  deleteSchedule,
  transitionSchedule,
  updateScheduleTimeSlot,
} from '@/lib/modules/mod-03-schedule-engine/service';
import { friendlyDbError } from '@/lib/modules/mod-02-master-list/validation';
import { ALLOWED_TRANSITIONS } from '@/lib/domain/schedule-status';

let db: Database.Database;
let fixtures: TestFixtures;

const input = () => ({
  section_id: fixtures.sectionId,
  subject_id: fixtures.subjectId,
  faculty_id: fixtures.facultyId,
  room_id: fixtures.roomId,
  time_slot_id: fixtures.timeSlotId,
  semester_id: fixtures.semesterId,
});

const statusOf = (id: number) =>
  (db.prepare('SELECT status FROM schedules WHERE id = ?').get(id) as { status: string }).status;

describe('schedule board workflow (MOD-05)', () => {
  beforeEach(() => {
    ({ db, fixtures } = createTestDb());
  });
  afterEach(() => destroyTestDb(db));

  it('shows the real conflict message to the admin, not a generic error', async () => {
    await createSchedule(input());
    const err = await createSchedule(input()).catch((e) => e);
    expect(friendlyDbError(err)).toContain('Faculty is already assigned');
  });

  it('returns non-blocking warnings instead of dropping them', async () => {
    db.prepare('INSERT INTO faculty_availability (faculty_id, time_slot_id, is_available) VALUES (?, ?, 0)').run(
      fixtures.facultyId,
      fixtures.timeSlotId
    );
    const created = await createSchedule(input());
    expect(created.warnings).toEqual(['Faculty is not available at this time slot']);
  });

  it('sends an approved class back to draft when it is moved', async () => {
    const s = await createSchedule(input());
    await transitionSchedule(s.id, 'PENDING_REVIEW');
    await transitionSchedule(s.id, 'APPROVED');
    await updateScheduleTimeSlot(s.id, fixtures.timeSlotId2);
    expect(statusOf(s.id)).toBe('DRAFT');
  });

  it('locks a published class against moves and deletes', async () => {
    const s = await createSchedule(input());
    for (const step of ['PENDING_REVIEW', 'APPROVED', 'PUBLISHED'] as const) {
      expect((await transitionSchedule(s.id, step)).ok).toBe(true);
    }
    const moveErr = await updateScheduleTimeSlot(s.id, fixtures.timeSlotId2).catch((e) => e);
    expect(friendlyDbError(moveErr)).toMatch(/^Cannot move a published class/);
    const delErr = await deleteSchedule(s.id).catch((e) => e);
    expect(friendlyDbError(delErr)).toMatch(/^Cannot delete a published class/);
    expect(statusOf(s.id)).toBe('PUBLISHED');

    expect((await transitionSchedule(s.id, 'CANCELLED')).ok).toBe(true);
  });

  it('rejects illegal transitions such as publishing a draft directly', async () => {
    const s = await createSchedule(input());
    const r = await transitionSchedule(s.id, 'PUBLISHED');
    expect(r.ok).toBe(false);
    expect(r.message).toBe('Illegal transition: DRAFT → PUBLISHED');
  });

  it('offers the board every status it can reach', () => {
    expect(ALLOWED_TRANSITIONS.DRAFT).toContain('PENDING_REVIEW');
    expect(ALLOWED_TRANSITIONS.APPROVED).toContain('PUBLISHED');
    expect(ALLOWED_TRANSITIONS.ARCHIVED).toEqual([]);
  });
});
