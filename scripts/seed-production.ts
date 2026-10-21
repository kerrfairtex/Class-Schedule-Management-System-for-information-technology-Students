import { getDb, initSchema } from '@/lib/persistence/db';
import { createUser, hashPassword } from '@/lib/modules/mod-01-auth/service';
import { ensureTimeSlots } from '@/lib/modules/mod-02-master-list/service';
import { DAYS, TIME_SLOTS, ORGANIZATION } from '@/lib/domain/constants';
import { EVIDENCE_SOURCES, INSTITUTIONAL_FACTS, getSource } from '@/lib/evidence/institutional-facts';

const DATA_ENVIRONMENT: 'DEMO' | 'VERIFIED' | 'PRODUCTION' = 'DEMO';

function getEnvPassword(envKey: string, fallback: string): string {
  const value = process.env[envKey];
  if (value && value.length >= 8) return value;
  return fallback;
}

async function main() {
  const db = await getDb();
  
  // Initialize schema if needed
  initSchema(db);
  
  // Departments
  const deptCount = (db.prepare('SELECT COUNT(*) as c FROM departments').get() as { c: number }).c;
  if (deptCount === 0) {
    db.prepare('INSERT INTO departments (code, name) VALUES (?, ?)').run(
      ORGANIZATION.departmentCode,
      ORGANIZATION.department
    );
    console.log('Created department');
  }
  
  const dept = db.prepare('SELECT id FROM departments WHERE code = ?').get(ORGANIZATION.departmentCode) as { id: number };
  
  // Programs
  const progCount = (db.prepare('SELECT COUNT(*) as c FROM programs').get() as { c: number }).c;
  if (progCount === 0) {
    db.prepare('INSERT INTO programs (department_id, code, name) VALUES (?, ?, ?)').run(
      dept.id, 'BSIT', 'Bachelor of Science in Information Technology'
    );
    console.log('Created program');
  }
  
  const program = db.prepare('SELECT id FROM programs WHERE code = ?').get('BSIT') as { id: number };
  
  // Academic Years
  const ayCount = (db.prepare('SELECT COUNT(*) as c FROM academic_years').get() as { c: number }).c;
  if (ayCount === 0) {
    db.prepare('INSERT INTO academic_years (label, start_date, end_date, is_active) VALUES (?, ?, ?, 1)').run(
      '2025-2026', '2025-08-01', '2026-05-31'
    );
    console.log('Created academic year');
  }
  
  const ay = db.prepare('SELECT id FROM academic_years WHERE is_active = 1').get() as { id: number };
  
  // Semesters
  const semCount = (db.prepare('SELECT COUNT(*) as c FROM semesters').get() as { c: number }).c;
  if (semCount === 0) {
    db.prepare('INSERT INTO semesters (academic_year_id, name, is_active) VALUES (?, ?, 1)').run(ay.id, '1st Semester');
    db.prepare('INSERT INTO semesters (academic_year_id, name, is_active) VALUES (?, ?, 0)').run(ay.id, '2nd Semester');
    console.log('Created semesters');
  }
  
  const semester = db.prepare('SELECT id FROM semesters WHERE is_active = 1').get() as { id: number };
  
  // Buildings
  const bldgCount = (db.prepare('SELECT COUNT(*) as c FROM buildings').get() as { c: number }).c;
  if (bldgCount === 0) {
    db.prepare('INSERT INTO buildings (code, name) VALUES (?, ?)').run('ITB', 'IT Building');
    db.prepare('INSERT INTO buildings (code, name) VALUES (?, ?)').run('LAB', 'Computer Laboratory');
    console.log('Created buildings');
  }
  
  // Ensure time slots
  try {
    ensureTimeSlots();
    console.log('Ensured time slots');
  } catch (e: any) {
    if (e.code === '23505' || e.message?.includes('duplicate key')) {
      console.log('Time slots already exist, skipping');
    } else {
      throw e;
    }
  }
  
  // Subjects
  const subCount = (db.prepare('SELECT COUNT(*) as c FROM subjects').get() as { c: number }).c;
  if (subCount === 0) {
    const insertSub = db.prepare('INSERT INTO subjects (code, name, credit_hours, program_id) VALUES (?, ?, ?, ?)');
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
    console.log('Created subjects');
  }
  
  // Curriculum
  const currCount = (db.prepare('SELECT COUNT(*) as c FROM curriculum').get() as { c: number }).c;
  if (currCount === 0) {
    const subjects = db.prepare('SELECT id, code FROM subjects').all() as { id: number; code: string }[];
    const insertCurr = db.prepare('INSERT INTO curriculum (program_id, subject_id, year_level, semester_number) VALUES (?, ?, ?, ?)');
    const mapping: Record<string, [number, number]> = {
      'IT 111': [1, 1], 'IT 112': [1, 1], 'IT 121': [1, 2], 'IT 122': [1, 2],
      'IT 211': [2, 1], 'IT 212': [2, 1], 'IT 221': [2, 2], 'IT 222': [2, 2],
    };
    for (const s of subjects) {
      const m = mapping[s.code];
      if (m) insertCurr.run(program.id, s.id, m[0], m[1]);
    }
    console.log('Created curriculum');
  }
  
  // Sections
  const secCount = (db.prepare('SELECT COUNT(*) as c FROM sections').get() as { c: number }).c;
  if (secCount === 0) {
    db.prepare('INSERT INTO sections (code, program_id, year_level, semester_id, capacity) VALUES (?, ?, ?, ?, ?)').run('BSIT-2A', program.id, 2, semester.id, 45);
    db.prepare('INSERT INTO sections (code, program_id, year_level, semester_id, capacity) VALUES (?, ?, ?, ?, ?)').run('BSIT-1A', program.id, 1, semester.id, 45);
    console.log('Created sections');
  }
  
  // Faculty
  const facCount = (db.prepare('SELECT COUNT(*) as c FROM faculty').get() as { c: number }).c;
  if (facCount === 0) {
    const insertFac = db.prepare('INSERT INTO faculty (employee_id, first_name, last_name, email, phone, department_id) VALUES (?, ?, ?, ?, ?, ?)');
    const f1 = insertFac.run('FAC-001', 'Maria', 'Santos', 'msantos@trac.edu.ph', '09171234567', dept.id);
    const f2 = insertFac.run('FAC-002', 'Juan', 'Delgado', 'jdelgado@trac.edu.ph', '09181234567', dept.id);
    const f3 = insertFac.run('FAC-003', 'Ana', 'Rashid', 'arashid@trac.edu.ph', '09191234567', dept.id);
    
    const subjects = db.prepare('SELECT id, code FROM subjects').all() as { id: number; code: string }[];
    const insertFS = db.prepare('INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)');
    const facultySubjects: Record<number, string[]> = {
      [Number(f1.lastInsertRowid ?? f1.lastID)]: ['IT 111', 'IT 112'],
      [Number(f2.lastInsertRowid ?? f2.lastID)]: ['IT 121', 'IT 122', 'IT 211'],
      [Number(f3.lastInsertRowid ?? f3.lastID)]: ['IT 212', 'IT 221', 'IT 222'],
    };
    for (const [facId, codes] of Object.entries(facultySubjects)) {
      for (const code of codes) {
        const sub = subjects.find((s) => s.code === code);
        if (sub) insertFS.run(Number(facId), sub.id);
      }
    }
    console.log('Created faculty');
  }
  
  // Students
  const stuCount = (db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number }).c;
  if (stuCount === 0) {
    const section2A = db.prepare('SELECT id FROM sections WHERE code = ?').get('BSIT-2A') as { id: number };
    const section1A = db.prepare('SELECT id FROM sections WHERE code = ?').get('BSIT-1A') as { id: number };
    db.prepare('INSERT INTO students (student_id, first_name, last_name, email, section_id) VALUES (?, ?, ?, ?, ?)').run('2022-0001', 'Demo', 'Student', 'demo.student@trac.edu.ph', section2A.id);
    db.prepare('INSERT INTO students (student_id, first_name, last_name, email, section_id) VALUES (?, ?, ?, ?, ?)').run('2023-0001', 'Sample', 'Enrollee', 'sample.enrollee@trac.edu.ph', section1A.id);
    console.log('Created students');
  }
  
  // Demo users
  const DEMO_ACCOUNTS = [
    { username: 'admin', role: 'admin' as const, passwordEnv: 'ADMIN_PASSWORD', passwordFallback: 'admin123' },
    { username: 'fac-001', role: 'faculty' as const, passwordEnv: 'FACULTY_PASSWORD', passwordFallback: 'faculty123' },
    { username: 'fac-002', role: 'faculty' as const, passwordEnv: 'FACULTY_PASSWORD', passwordFallback: 'faculty123' },
    { username: 'fac-003', role: 'faculty' as const, passwordEnv: 'FACULTY_PASSWORD', passwordFallback: 'faculty123' },
    { username: '2022-0001', role: 'student' as const, passwordEnv: 'STUDENT_PASSWORD', passwordFallback: 'student123' },
    { username: '2023-0001', role: 'student' as const, passwordEnv: 'STUDENT_PASSWORD', passwordFallback: 'student123' },
  ] as const;
  
  const seedDefaultUsers = process.env.SEED_DEFAULT_USERS !== '0';
  if (seedDefaultUsers) {
    const facultyRows = db.prepare('SELECT id, employee_id FROM faculty').all();
    const faculty = Array.isArray(facultyRows) ? facultyRows : [];
    const facultyByEmployeeId = new Map(faculty.map(f => [f.employee_id.toLowerCase(), f.id]));
    const studentRows = db.prepare('SELECT id, student_id FROM students').all();
    const students = Array.isArray(studentRows) ? studentRows : [];
    const studentsByStudentId = new Map(students.map(s => [s.student_id, s.id]));
    
    for (const account of DEMO_ACCOUNTS) {
      const password = getEnvPassword(account.passwordEnv, account.passwordFallback);
      const passwordHash = hashPassword(password);
      
      let resolvedFacultyId: number | undefined;
      let resolvedStudentId: number | undefined;
      
      if (account.role === 'faculty') {
        resolvedFacultyId = facultyByEmployeeId.get(account.username);
      } else if (account.role === 'student') {
        resolvedStudentId = studentsByStudentId.get(account.username);
      }
      
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(account.username) as { id: number } | undefined;
      
      if (existingUser) {
        db.prepare('UPDATE users SET password_hash = ?, must_change_password = ?, faculty_id = ?, student_id = ? WHERE id = ?')
          .run(passwordHash, 0, resolvedFacultyId ?? null, resolvedStudentId ?? null, existingUser.id);
      } else {
        db.prepare('INSERT INTO users (username, password_hash, role, faculty_id, student_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?)')
          .run(account.username, passwordHash, account.role, resolvedFacultyId ?? null, resolvedStudentId ?? null, 0);
      }
    }
    console.log('Seeded demo users');
  }
  
  console.log('Seeding complete!');
}

main().catch(console.error);