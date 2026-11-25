import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb, destroyTestDb, type TestFixtures } from '@/lib/persistence/test-db';
import {
  createRoom,
  createSectionSets,
  createSubject,
  getSections,
  subjectHours,
  updateSection,
} from '@/lib/modules/mod-02-master-list/service';
import { friendlyDbError } from '@/lib/modules/mod-02-master-list/validation';

let db: Database.Database;
let f: TestFixtures;

describe('subjects: units and hours', () => {
  it('derives total units from lecture + lab units', () => {
    expect(subjectHours(0, { lec_units: 2, lab_units: 1, lab_hours: 3 })).toEqual({
      credit_hours: 3, lec_units: 2, lab_units: 1, lec_hours: 2, lab_hours: 3,
    });
  });
  it('treats an old-style subject as all lecture', () => {
    expect(subjectHours(3, {})).toEqual({ credit_hours: 3, lec_units: 3, lab_units: 0, lec_hours: 3, lab_hours: 0 });
  });
});

describe('master list scheduling fields', () => {
  beforeEach(() => ({ db, fixtures: f } = createTestDb()));
  afterEach(() => destroyTestDb(db));

  it('stores a lecture + lab subject', async () => {
    const id = await createSubject('IT 121', 'Data Structures and Algorithms', 0, f.programId, undefined, {
      lec_units: 2, lab_units: 1, lec_hours: 2, lab_hours: 3,
    });
    expect(db.prepare('SELECT credit_hours, lec_units, lab_units, lec_hours, lab_hours FROM subjects WHERE id = ?').get(id)).toEqual({
      credit_hours: 3, lec_units: 2, lab_units: 1, lec_hours: 2, lab_hours: 3,
    });
  });

  it('adds the next sets for a year level, skipping existing codes', async () => {
    // BSIT-1A exists in the fixtures.
    expect(await createSectionSets(f.programId, 1, 2, f.semesterId)).toEqual(['BSIT-1B', 'BSIT-1C']);
    expect(await createSectionSets(f.programId, 2, 1, f.semesterId)).toEqual(['BSIT-2A']);
    const err = await createSectionSets(f.programId, 1, 0, f.semesterId).catch((e) => e);
    expect(friendlyDbError(err)).toBe('Add between 1 and 12 sets at a time.');
  });

  it('records an adviser, home room and class size per set', async () => {
    const lab = await createRoom(1, 'LAB-1', 'Computer Lab 1', 35, undefined, { room_type: 'LAB' });
    await updateSection(f.sectionId, 'BSIT-1A', f.programId, 1, f.semesterId, undefined, {
      capacity: 32, adviser_id: f.facultyId, home_room_id: lab,
    });
    const [s] = await getSections(f.semesterId);
    expect(s).toMatchObject({ capacity: 32, adviser_name: 'Test Faculty', home_room_code: 'LAB-1' });
    expect(db.prepare('SELECT room_type FROM rooms WHERE id = ?').get(lab)).toEqual({ room_type: 'LAB' });
  });
});
