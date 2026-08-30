import { getDb } from '@/lib/persistence/db';
import { createUser } from '@/lib/modules/mod-01-auth/service';
import { ensureTimeSlots } from '@/lib/modules/mod-02-master-list/service';
import { DAYS, TIME_SLOTS, ORGANIZATION } from '@/lib/domain/constants';
import {
  EVIDENCE_SOURCES,
  INSTITUTIONAL_FACTS,
  getSource,
} from '@/lib/evidence/institutional-facts';

let seeded = false;
let evidenceSeeded = false;

/**
 * Spec §63/§64: distinguish project/sample data from institutional data.
 * All seed entries below are DEMO. They must NOT be presented as institutional
 * facts and must NOT appear on the public schedule until VERIFIED.
 *
 * data_environment is a per-deployment flag:
 *   DEMO      — development fixtures, never authoritative
 *   VERIFIED  — backed by registrar/HR records
 *   PRODUCTION — fully authorized
 */
const DATA_ENVIRONMENT: 'DEMO' | 'VERIFIED' | 'PRODUCTION' = 'DEMO';

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
      'INSERT INTO sections (code, program_id, year_level, semester_id, capacity) VALUES (?, ?, ?, ?, ?)'
    ).run('BSIT-2A', program.id, 2, semester.id, 45);
    db.prepare(
      'INSERT INTO sections (code, program_id, year_level, semester_id, capacity) VALUES (?, ?, ?, ?, ?)'
    ).run('BSIT-1A', program.id, 1, semester.id, 45);
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
    ).run('2022-0001', 'Demo', 'Student', 'demo.student@trac.edu.ph', section2A.id);
    db.prepare(
      'INSERT INTO students (student_id, first_name, last_name, email, section_id) VALUES (?, ?, ?, ?, ?)'
    ).run('2023-0001', 'Sample', 'Enrollee', 'sample.enrollee@trac.edu.ph', section1A.id);
  }

  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const seedDefaultUsers = process.env.SEED_DEFAULT_USERS !== '0';
  if (userCount === 0 && seedDefaultUsers) {
    // Spec §63/§65: these seed users are DEMO records. They MUST be cleared
    // from production before deployment to a verified environment.
    console.warn(
      `[SEED] Seeding DEMO accounts in ${DATA_ENVIRONMENT} environment. ` +
        'These MUST be removed before production deployment per spec §65.'
    );
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

/**
 * Seed the evidence layer (sources, institutional_facts, fact_sources,
 * verification_records, officials, institution_contacts, system_settings)
 * with the verified facts from lib/evidence/institutional-facts.ts.
 *
 * Spec §61: "The initial database should contain at least: TRAC legal name,
 * TRAC legal foundation, 1983 establishment, Nalil/Bongao/Tawi-Tawi location,
 * Current TRAC website, Current BSIT offering, Institute of Computing Studies,
 * Current institutional mission, Current institutional vision, Four-fold
 * institutional thrust, Official institutional contact channels."
 */
export function ensureEvidenceSeeded(): void {
  if (evidenceSeeded) return;
  const db = getDb();

  const sourcesCount = (db.prepare('SELECT COUNT(*) as c FROM sources').get() as { c: number }).c;
  if (sourcesCount === 0) {
    const insertSource = db.prepare(
      `INSERT INTO sources (id, title, source_type, authority_level, publisher, url, document_date, accessed_at, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const s of EVIDENCE_SOURCES) {
      insertSource.run(
        s.id,
        s.title,
        s.sourceType,
        s.authorityLevel,
        s.publisher,
        s.url ?? null,
        s.documentDate ?? null,
        s.accessedAt,
        s.status,
        s.notes ?? null
      );
    }
  }

  const factsCount = (db.prepare('SELECT COUNT(*) as c FROM institutional_facts').get() as { c: number }).c;
  if (factsCount === 0) {
    const insertFact = db.prepare(
      `INSERT INTO institutional_facts (id, category, key, value, value_type, status, confidence, effective_from, verified_at, review_due_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertFactSource = db.prepare(
      `INSERT INTO fact_sources (fact_id, source_id, supports) VALUES (?, ?, 1)`
    );
    const insertVerification = db.prepare(
      `INSERT INTO verification_records (fact_id, verified_by, verified_at, verification_method, source_count, authority_level, next_review_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const f of INSTITUTIONAL_FACTS) {
      insertFact.run(
        f.id,
        f.category,
        f.key,
        f.value,
        f.valueType,
        f.status,
        f.confidence,
        f.effectiveFrom ?? null,
        f.verifiedAt,
        f.reviewDueAt ?? null,
        f.notes ?? null
      );
      insertFactSource.run(f.id, f.sourceId);
      const source = getSource(f.sourceId);
      insertVerification.run(
        f.id,
        'csms-developer-team',
        f.verifiedAt,
        'manual-review-of-source',
        1,
        source?.authorityLevel ?? 0,
        f.reviewDueAt ?? null
      );
    }
  }

  // Institution contacts (spec §13/§51)
  const contactsCount = (db.prepare('SELECT COUNT(*) as c FROM institution_contacts').get() as { c: number }).c;
  if (contactsCount === 0) {
    const insertContact = db.prepare(
      `INSERT INTO institution_contacts (office, contact_type, value, label, is_primary, source_id, verified_at, data_environment)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED')`
    );
    const contacts: Array<[string, 'email'|'mobile'|'phone', string, string|null, number, string]> = [
      ['Office of the College President', 'email', 'op@trac.edu.ph', null, 1, 'SRC-TRAC-WEB'],
      ['Office of the College Registrar', 'email', 'registrar@trac.edu.ph', null, 1, 'SRC-TRAC-WEB'],
      ['Office of Admission', 'email', 'admission@trac.edu.ph', null, 1, 'SRC-TRAC-WEB'],
      ['Office of Admission', 'mobile', '0951-733-7474', null, 1, 'SRC-TRAC-WEB'],
    ];
    for (const c of contacts) {
      insertContact.run(...c, '2026-08-31');
    }
  }

  // Officials (spec §13/§75). All marked PENDING_VERIFICATION / DEMO until
  // a CHED or official TRAC directory confirms current appointments.
  const officialsCount = (db.prepare('SELECT COUNT(*) as c FROM officials').get() as { c: number }).c;
  if (officialsCount === 0) {
    const insertOfficial = db.prepare(
      `INSERT INTO officials (position, first_name, middle_name, last_name, title, source_id, status, data_environment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    // Names below were visible on the TRAC official website at access date.
    // Marked PENDING_VERIFICATION until an official directory confirms each.
    const officials: Array<[string, string, string|null, string, string|null, string, string]> = [
      ['College President', 'Sitti Amina', 'J.', 'Mohammad', 'SUC President I', 'SRC-TRAC-WEB', 'PENDING_VERIFICATION'],
      ['Vice President for Academic Affairs', 'Al-Ghazier', 'H.', 'Kandon', 'Ph.D.', 'SRC-TRAC-WEB', 'PENDING_VERIFICATION'],
      ['Dean of Institute of Computing Studies', 'Abubakar', 'M.', 'Hiyang', 'MIT', 'SRC-TRAC-WEB', 'PENDING_VERIFICATION'],
      ['Dean of Admission', 'Alnalyn', 'K.', 'Saral', 'Ed.D.', 'SRC-TRAC-WEB', 'PENDING_VERIFICATION'],
    ];
    for (const o of officials) {
      insertOfficial.run(...o, 'DEMO');
    }
  }

  // System settings (spec §64)
  const settingsCount = (db.prepare('SELECT COUNT(*) as c FROM system_settings').get() as { c: number }).c;
  if (settingsCount === 0) {
    const insertSetting = db.prepare(
      `INSERT INTO system_settings (key, value, description, updated_by) VALUES (?, ?, ?, ?)`
    );
    insertSetting.run('system_status', 'DEVELOPMENT', 'Per spec §47: not yet formally institutionally adopted.', 'csms-developer-team');
    insertSetting.run('data_environment', 'DEMO', 'Per spec §64: development fixtures, never authoritative.', 'csms-developer-team');
    insertSetting.run('verification_baseline', '2026-08-31', 'Date when source-of-truth baseline was established.', 'csms-developer-team');
  }

  evidenceSeeded = true;
}
