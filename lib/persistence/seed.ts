import { getDb } from '@/lib/persistence/db';
import { createUser } from '@/lib/modules/mod-01-auth/service';
import { ensureTimeSlots } from '@/lib/modules/mod-02-master-list/service';
import { DAYS, TIME_SLOTS, ORGANIZATION } from '@/lib/domain/constants';

let seeded = false;

function getEnvPassword(envKey: string, fallback: string): string {
  const value = process.env[envKey];
  if (value && value.length >= 8) return value;
  return fallback;
}

export function ensureSeeded() {
  if (seeded) return;
  const db = getDb();

  const deptCount = (db.prepare('SELECT COUNT(*) as c FROM departments').get() as { c: number }).c;
  if (deptCount === 0) {
    db.prepare('INSERT INTO departments (code, name) VALUES (?, ?)').run(
      ORGANIZATION.departmentCode,
      ORGANIZATION.department
    );
  }

  const dept = db
    .prepare('SELECT id FROM departments WHERE code = ?')
    .get(ORGANIZATION.departmentCode) as { id: number };

  const progCount = (db.prepare('SELECT COUNT(*) as c FROM programs').get() as { c: number }).c;
  if (progCount === 0) {
    db.prepare('INSERT INTO programs (department_id, code, name) VALUES (?, ?, ?)').run(
      dept.id,
      'BSIT',
      'Bachelor of Science in Information Technology'
    );
  }

  const program = db.prepare('SELECT id FROM programs WHERE code = ?').get('BSIT') as { id: number };

  const ayCount = (db.prepare('SELECT COUNT(*) as c FROM academic_years').get() as { c: number }).c;
  if (ayCount === 0) {
    db.prepare(
      'INSERT INTO academic_years (label, start_date, end_date, is_active) VALUES (?, ?, ?, 1)'
    ).run('2025-2026', '2025-08-01', '2026-05-31');
  }

  const ay = db
    .prepare('SELECT id FROM academic_years WHERE is_active = 1')
    .get() as { id: number };

  const semCount = (db.prepare('SELECT COUNT(*) as c FROM semesters').get() as { c: number }).c;
  if (semCount === 0) {
    db.prepare('INSERT INTO semesters (academic_year_id, name, is_active) VALUES (?, ?, 1)').run(
      ay.id,
      '1st Semester'
    );
    db.prepare('INSERT INTO semesters (academic_year_id, name, is_active) VALUES (?, ?, 0)').run(
      ay.id,
      '2nd Semester'
    );
  }

  const semester = db
    .prepare('SELECT id FROM semesters WHERE is_active = 1')
    .get() as { id: number };

  const bldgCount = (db.prepare('SELECT COUNT(*) as c FROM buildings').get() as { c: number }).c;
  if (bldgCount === 0) {
    db.prepare('INSERT INTO buildings (code, name) VALUES (?, ?)').run('ITB', 'IT Building');
    db.prepare('INSERT INTO buildings (code, name) VALUES (?, ?)').run('LAB', 'Computer Laboratory');
  }

  const itb = db.prepare('SELECT id FROM buildings WHERE code = ?').get('ITB') as { id: number };
  const lab = db.prepare('SELECT id FROM buildings WHERE code = ?').get('LAB') as { id: number };

  const roomCount = (db.prepare('SELECT COUNT(*) as c FROM rooms').get() as { c: number }).c;
  if (roomCount === 0) {
    const insertRoom = db.prepare(
      'INSERT INTO rooms (building_id, code, name, capacity) VALUES (?, ?, ?, ?)'
    );
    insertRoom.run(itb.id, 'IT-101', 'IT Lecture Room 1', 50);
    insertRoom.run(itb.id, 'IT-102', 'IT Lecture Room 2', 45);
    insertRoom.run(lab.id, 'LAB-1', 'Computer Lab 1', 40);
    insertRoom.run(lab.id, 'LAB-2', 'Computer Lab 2', 35);
  }

  ensureTimeSlots();

  const subCount = (db.prepare('SELECT COUNT(*) as c FROM subjects').get() as { c: number }).c;
  if (subCount === 0) {
    const insertSub = db.prepare(
      'INSERT INTO subjects (code, name, credit_hours, program_id) VALUES (?, ?, ?, ?)'
    );
    const subjects = [
      ['IT 111', 'Introduction to Computing', 3],
      ['IT 112', 'Computer Programming 1', 3],
      ['IT 121', 'Data Structures and Algorithms', 3],
      ['IT 122', 'Database Management Systems', 3],
      ['IT 211', 'Web Systems and Technologies', 3],
      ['IT 212', 'Systems Analysis and Design', 3],
      ['IT 221', 'Software Engineering', 3],
      ['IT 222', 'Networking 1', 3],
    ] as const;
    for (const [code, name, credits] of subjects) {
      insertSub.run(code, name, credits, program.id);
    }
  }

  const currCount = (db.prepare('SELECT COUNT(*) as c FROM curriculum').get() as { c: number }).c;
  if (currCount === 0) {
    const subjects = db.prepare('SELECT id, code FROM subjects').all() as { id: number; code: string }[];
    const insertCurr = db.prepare(
      'INSERT INTO curriculum (program_id, subject_id, year_level, semester_number) VALUES (?, ?, ?, ?)'
    );
    const mapping: Record<string, [number, number]> = {
      'IT 111': [1, 1],
      'IT 112': [1, 1],
      'IT 121': [1, 2],
      'IT 122': [1, 2],
      'IT 211': [2, 1],
      'IT 212': [2, 1],
      'IT 221': [2, 2],
      'IT 222': [2, 2],
    };
    for (const s of subjects) {
      const m = mapping[s.code];
      if (m) insertCurr.run(program.id, s.id, m[0], m[1]);
    }
  }

  const secCount = (db.prepare('SELECT COUNT(*) as c FROM sections').get() as { c: number }).c;
  if (secCount === 0) {
    db.prepare(
      'INSERT INTO sections (code, program_id, year_level, semester_id) VALUES (?, ?, ?, ?)'
    ).run('BSIT-2A', program.id, 2, semester.id);
    db.prepare(
      'INSERT INTO sections (code, program_id, year_level, semester_id) VALUES (?, ?, ?, ?)'
    ).run('BSIT-1A', program.id, 1, semester.id);
  }

  const facCount = (db.prepare('SELECT COUNT(*) as c FROM faculty').get() as { c: number }).c;
  if (facCount === 0) {
    const insertFac = db.prepare(
      `INSERT INTO faculty (employee_id, first_name, last_name, email, phone, department_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const f1 = insertFac.run('FAC-001', 'Maria', 'Santos', 'msantos@trac.edu.ph', '09171234567', dept.id);
    const f2 = insertFac.run('FAC-002', 'Juan', 'Delgado', 'jdelgado@trac.edu.ph', '09181234567', dept.id);
    const f3 = insertFac.run('FAC-003', 'Ana', 'Rashid', 'arashid@trac.edu.ph', '09191234567', dept.id);

    const subjects = db.prepare('SELECT id, code FROM subjects').all() as { id: number; code: string }[];
    const insertFS = db.prepare('INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)');
    const facultySubjects: Record<number, string[]> = {
      [Number(f1.lastInsertRowid)]: ['IT 111', 'IT 112'],
      [Number(f2.lastInsertRowid)]: ['IT 121', 'IT 122', 'IT 211'],
      [Number(f3.lastInsertRowid)]: ['IT 212', 'IT 221', 'IT 222'],
    };
    for (const [facId, codes] of Object.entries(facultySubjects)) {
      for (const code of codes) {
        const sub = subjects.find((s) => s.code === code);
        if (sub) insertFS.run(Number(facId), sub.id);
      }
    }
  }

  const stuCount = (db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number }).c;
  if (stuCount === 0) {
    const section2A = db
      .prepare('SELECT id FROM sections WHERE code = ?')
      .get('BSIT-2A') as { id: number };
    const section1A = db
      .prepare('SELECT id FROM sections WHERE code = ?')
      .get('BSIT-1A') as { id: number };
    db.prepare(
      'INSERT INTO students (student_id, first_name, last_name, email, section_id) VALUES (?, ?, ?, ?, ?)'
    ).run('2022-0001', 'Ahmad', 'Hassan', 'ahassan@trac.edu.ph', section2A.id);
    db.prepare(
      'INSERT INTO students (student_id, first_name, last_name, email, section_id) VALUES (?, ?, ?, ?, ?)'
    ).run('2023-0001', 'Fatima', 'Ibrahim', 'fibrahim@trac.edu.ph', section1A.id);
  }

  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const seedDefaultUsers = process.env.SEED_DEFAULT_USERS !== '0';
  if (userCount === 0 && seedDefaultUsers) {
    createUser({ username: 'admin', password: getEnvPassword('ADMIN_PASSWORD', 'admin123'), role: 'admin' });

    const faculty = db.prepare('SELECT id, employee_id FROM faculty').all() as {
      id: number;
      employee_id: string;
    }[];
    for (const f of faculty) {
      createUser({
        username: f.employee_id.toLowerCase(),
        password: getEnvPassword('FACULTY_PASSWORD', 'faculty123'),
        role: 'faculty',
        faculty_id: f.id,
      });
    }

    const students = db.prepare('SELECT id, student_id FROM students').all() as {
      id: number;
      student_id: string;
    }[];
    for (const s of students) {
      createUser({
        username: s.student_id,
        password: getEnvPassword('STUDENT_PASSWORD', 'student123'),
        role: 'student',
        student_id: s.id,
      });
    }
  }

  seeded = true;
}
