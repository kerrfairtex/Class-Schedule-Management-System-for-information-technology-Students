import Database from 'better-sqlite3';
import { initSchema, setDb, resetDb } from '@/lib/persistence/db';

export interface TestFixtures {
  departmentId: number;
  programId: number;
  semesterId: number;
  sectionId: number;
  subjectId: number;
  facultyId: number;
  roomId: number;
  timeSlotId: number;
  timeSlotId2: number;
}

export function createTestDb(): { db: Database.Database; fixtures: TestFixtures } {
  resetDb();
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  setDb(db);

  db.prepare('INSERT INTO departments (code, name) VALUES (?, ?)').run('BSIT', 'BSIT Dept');
  const departmentId = Number(
    (db.prepare('SELECT id FROM departments').get() as { id: number }).id
  );

  db.prepare('INSERT INTO programs (department_id, code, name) VALUES (?, ?, ?)').run(
    departmentId,
    'BSIT',
    'BSIT Program'
  );
  const programId = Number((db.prepare('SELECT id FROM programs').get() as { id: number }).id);

  db.prepare(
    'INSERT INTO academic_years (label, is_active) VALUES (?, 1)'
  ).run('2025-2026');
  const ayId = Number((db.prepare('SELECT id FROM academic_years').get() as { id: number }).id);

  db.prepare('INSERT INTO semesters (academic_year_id, name, is_active) VALUES (?, ?, 1)').run(
    ayId,
    '1st Semester'
  );
  const semesterId = Number((db.prepare('SELECT id FROM semesters').get() as { id: number }).id);

  db.prepare('INSERT INTO buildings (code, name) VALUES (?, ?)').run('ITB', 'IT Building');
  const buildingId = Number((db.prepare('SELECT id FROM buildings').get() as { id: number }).id);

  db.prepare('INSERT INTO rooms (building_id, code, name, capacity) VALUES (?, ?, ?, ?)').run(
    buildingId,
    'R101',
    'Room 101',
    40
  );
  const roomId = Number((db.prepare('SELECT id FROM rooms').get() as { id: number }).id);

  db.prepare(
    'INSERT INTO subjects (code, name, credit_hours, program_id) VALUES (?, ?, ?, ?)'
  ).run('IT 101', 'Intro to Computing', 3, programId);
  const subjectId = Number((db.prepare('SELECT id FROM subjects').get() as { id: number }).id);

  db.prepare(
    'INSERT INTO curriculum (program_id, subject_id, year_level, semester_number) VALUES (?, ?, ?, ?)'
  ).run(programId, subjectId, 1, 1);

  db.prepare(
    'INSERT INTO sections (code, program_id, year_level, semester_id) VALUES (?, ?, ?, ?)'
  ).run('BSIT-1A', programId, 1, semesterId);
  const sectionId = Number((db.prepare('SELECT id FROM sections').get() as { id: number }).id);

  db.prepare(
    `INSERT INTO faculty (employee_id, first_name, last_name, email, phone, department_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run('FAC-TEST', 'Test', 'Faculty', 't@trac.edu.ph', '09000000000', departmentId);
  const facultyId = Number((db.prepare('SELECT id FROM faculty').get() as { id: number }).id);

  db.prepare('INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)').run(
    facultyId,
    subjectId
  );

  db.prepare(
    'INSERT INTO time_slots (day_of_week, start_time, end_time) VALUES (?, ?, ?)'
  ).run('monday', '09:00', '10:00');
  const timeSlotId = Number(
    (db.prepare('SELECT id FROM time_slots WHERE start_time = ?').get('09:00') as { id: number }).id
  );

  db.prepare(
    'INSERT INTO time_slots (day_of_week, start_time, end_time) VALUES (?, ?, ?)'
  ).run('tuesday', '09:00', '10:00');
  const timeSlotId2 = Number(
    (db.prepare('SELECT id FROM time_slots WHERE day_of_week = ?').get('tuesday') as { id: number })
      .id
  );

  return {
    db,
    fixtures: {
      departmentId,
      programId,
      semesterId,
      sectionId,
      subjectId,
      facultyId,
      roomId,
      timeSlotId,
      timeSlotId2,
    },
  };
}

export function destroyTestDb(db: Database.Database) {
  db.close();
  resetDb();
}
