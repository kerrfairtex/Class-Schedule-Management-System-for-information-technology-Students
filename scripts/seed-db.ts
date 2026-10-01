import { getDb, initSchema } from '@/lib/persistence/db';
import { hashPassword } from '@/lib/modules/mod-01-auth/service';
import { ensureTimeSlots } from '@/lib/modules/mod-02-master-list/service';
import { ORGANIZATION } from '@/lib/domain/constants';

async function seedDatabase() {
  const db = await getDb();
  await initSchema(db);
  
  // Helper to await database operations
  const get = async (sql: string, ...params: any[]) => {
    const result = db.prepare(sql).get(...params);
    return result instanceof Promise ? await result : result;
  };
  
  const all = async (sql: string, ...params: any[]) => {
    const result = db.prepare(sql).all(...params);
    return result instanceof Promise ? await result : result;
  };
  
  const run = async (sql: string, ...params: any[]) => {
    const result = db.prepare(sql).run(...params);
    return result instanceof Promise ? await result : result;
  };

  const deptCount = (await get('SELECT COUNT(*) as c FROM departments'))?.c || 0;
  if (deptCount === 0) {
    await run('INSERT INTO departments (code, name) VALUES (?, ?)', ORGANIZATION.departmentCode, ORGANIZATION.department);
  }

  const dept = await get('SELECT id FROM departments WHERE code = ?', ORGANIZATION.departmentCode) as { id: number };
  if (!dept) throw new Error('Department not found');

  const progCount = (await get('SELECT COUNT(*) as c FROM programs'))?.c || 0;
  if (progCount === 0) {
    await run('INSERT INTO programs (department_id, code, name) VALUES (?, ?, ?)', dept.id, 'BSIT', 'Bachelor of Science in Information Technology');
  }

  const program = await get('SELECT id FROM programs WHERE code = ?', 'BSIT') as { id: number };
  if (!program) throw new Error('Program not found');

  const ayCount = (await get('SELECT COUNT(*) as c FROM academic_years'))?.c || 0;
  if (ayCount === 0) {
    await run('INSERT INTO academic_years (label, start_date, end_date, is_active) VALUES (?, ?, ?, 1)', '2025-2026', '2025-08-01', '2026-05-31');
  }

  const ay = await get('SELECT id FROM academic_years WHERE is_active = 1') as { id: number };
  if (!ay) throw new Error('Academic year not found');

  const semCount = (await get('SELECT COUNT(*) as c FROM semesters'))?.c || 0;
  if (semCount === 0) {
    await run('INSERT INTO semesters (academic_year_id, name, is_active) VALUES (?, ?, 1)', ay.id, '1st Semester');
    await run('INSERT INTO semesters (academic_year_id, name, is_active) VALUES (?, ?, 0)', ay.id, '2nd Semester');
  }

  const semester = await get('SELECT id FROM semesters WHERE is_active = 1') as { id: number };
  if (!semester) throw new Error('Semester not found');

  const bldgCount = (await get('SELECT COUNT(*) as c FROM buildings'))?.c || 0;
  if (bldgCount === 0) {
    await run('INSERT INTO buildings (code, name) VALUES (?, ?)', 'ITB', 'IT Building');
    await run('INSERT INTO buildings (code, name) VALUES (?, ?)', 'LAB', 'Computer Laboratory');
  }

  const itb = await get('SELECT id FROM buildings WHERE code = ?', 'ITB') as { id: number };
  const lab = await get('SELECT id FROM buildings WHERE code = ?', 'LAB') as { id: number };

  const roomCount = (await get('SELECT COUNT(*) as c FROM rooms'))?.c || 0;
  if (roomCount === 0) {
    await run('INSERT INTO rooms (building_id, code, name, capacity) VALUES (?, ?, ?, ?)', itb.id, 'IT-101', 'IT Lecture Room 1', 50);
    await run('INSERT INTO rooms (building_id, code, name, capacity) VALUES (?, ?, ?, ?)', itb.id, 'IT-102', 'IT Lecture Room 2', 45);
    await run('INSERT INTO rooms (building_id, code, name, capacity) VALUES (?, ?, ?, ?)', lab.id, 'LAB-1', 'Computer Lab 1', 40);
    await run('INSERT INTO rooms (building_id, code, name, capacity) VALUES (?, ?, ?, ?)', lab.id, 'LAB-2', 'Computer Lab 2', 35);
  }

  await ensureTimeSlots();

  const subCount = (await get('SELECT COUNT(*) as c FROM subjects'))?.c || 0;
  if (subCount === 0) {
    const subjects = [
      ['IT 111', 'Introduction to Computing', 3],
      ['IT 112', 'Computer Programming 1', 3],
      ['IT 121', 'Data Structures and Algorithms', 3],
      ['IT 122', 'Database Management Systems', 3],
      ['IT 211', 'Web Systems and Technologies', 3],
      ['IT 212', 'Systems Analysis and Design', 3],
      ['IT 221', 'Software Engineering', 3],
      ['IT 222', 'Networking 1', 3],
    ];
    for (const [code, name, credits] of subjects) {
      await run('INSERT INTO subjects (code, name, credit_hours, program_id) VALUES (?, ?, ?, ?)', code, name, credits, program.id);
    }
  }

  const currCount = (await get('SELECT COUNT(*) as c FROM curriculum'))?.c || 0;
  if (currCount === 0) {
    const subjects = await all('SELECT id, code FROM subjects') as { id: number; code: string }[];
    const mapping: Record<string, [number, number]> = {
      'IT 111': [1, 1], 'IT 112': [1, 1], 'IT 121': [1, 2], 'IT 122': [1, 2],
      'IT 211': [2, 1], 'IT 212': [2, 1], 'IT 221': [2, 2], 'IT 222': [2, 2],
    };
    for (const s of subjects) {
      const m = mapping[s.code];
      if (m) await run('INSERT INTO curriculum (program_id, subject_id, year_level, semester_number) VALUES (?, ?, ?, ?)', program.id, s.id, m[0], m[1]);
    }
  }

  const secCount = (await get('SELECT COUNT(*) as c FROM sections'))?.c || 0;
  if (secCount === 0) {
    await run('INSERT INTO sections (code, program_id, year_level, semester_id, capacity) VALUES (?, ?, ?, ?, ?)', 'BSIT-2A', program.id, 2, semester.id, 45);
    await run('INSERT INTO sections (code, program_id, year_level, semester_id, capacity) VALUES (?, ?, ?, ?, ?)', 'BSIT-1A', program.id, 1, semester.id, 45);
  }

  const facCount = (await get('SELECT COUNT(*) as c FROM faculty'))?.c || 0;
  if (facCount === 0) {
    const f1 = await run('INSERT INTO faculty (employee_id, first_name, last_name, email, phone, department_id) VALUES (?, ?, ?, ?, ?, ?)', 'FAC-001', 'Maria', 'Santos', 'msantos@trac.edu.ph', '09171234567', dept.id);
    const f2 = await run('INSERT INTO faculty (employee_id, first_name, last_name, email, phone, department_id) VALUES (?, ?, ?, ?, ?, ?)', 'FAC-002', 'Juan', 'Delgado', 'jdelgado@trac.edu.ph', '09181234567', dept.id);
    const f3 = await run('INSERT INTO faculty (employee_id, first_name, last_name, email, phone, department_id) VALUES (?, ?, ?, ?, ?, ?)', 'FAC-003', 'Ana', 'Rashid', 'arashid@trac.edu.ph', '09191234567', dept.id);

    const subjects = await all('SELECT id, code FROM subjects') as { id: number; code: string }[];
    const facultySubjects: Record<number, string[]> = {
      [Number(f1.lastID)]: ['IT 111', 'IT 112'],
      [Number(f2.lastID)]: ['IT 121', 'IT 122', 'IT 211'],
      [Number(f3.lastID)]: ['IT 212', 'IT 221', 'IT 222'],
    };
    for (const [facId, codes] of Object.entries(facultySubjects)) {
      for (const code of codes) {
        const sub = subjects.find((s) => s.code === code);
        if (sub) await run('INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)', Number(facId), sub.id);
      }
    }
  }

  const stuCount = (await get('SELECT COUNT(*) as c FROM students'))?.c || 0;
  if (stuCount === 0) {
    const section2A = await get('SELECT id FROM sections WHERE code = ?', 'BSIT-2A') as { id: number };
    const section1A = await get('SELECT id FROM sections WHERE code = ?', 'BSIT-1A') as { id: number };
    await run('INSERT INTO students (student_id, first_name, last_name, email, section_id) VALUES (?, ?, ?, ?, ?)', '2022-0001', 'Demo', 'Student', 'demo.student@trac.edu.ph', section2A.id);
    await run('INSERT INTO students (student_id, first_name, last_name, email, section_id) VALUES (?, ?, ?, ?, ?)', '2023-0001', 'Sample', 'Enrollee', 'sample.enrollee@trac.edu.ph', section1A.id);
  }

  // Demo user definitions
  const DEMO_ACCOUNTS = [
    { username: 'admin', role: 'admin', faculty_id: undefined, student_id: undefined, passwordEnv: 'ADMIN_PASSWORD', passwordFallback: 'admin123' },
    { username: 'fac-001', role: 'faculty', faculty_id: undefined, student_id: undefined, passwordEnv: 'FACULTY_PASSWORD', passwordFallback: 'faculty123' },
    { username: 'fac-002', role: 'faculty', faculty_id: undefined, student_id: undefined, passwordEnv: 'FACULTY_PASSWORD', passwordFallback: 'faculty123' },
    { username: 'fac-003', role: 'faculty', faculty_id: undefined, student_id: undefined, passwordEnv: 'FACULTY_PASSWORD', passwordFallback: 'faculty123' },
    { username: '2022-0001', role: 'student', faculty_id: undefined, student_id: undefined, passwordEnv: 'STUDENT_PASSWORD', passwordFallback: 'student123' },
    { username: '2023-0001', role: 'student', faculty_id: undefined, student_id: undefined, passwordEnv: 'STUDENT_PASSWORD', passwordFallback: 'student123' },
  ] as const;

  const seedDefaultUsers = process.env.SEED_DEFAULT_USERS !== '0';
  if (seedDefaultUsers) {
    console.warn('[SEED] Seeding/synchronizing DEMO accounts in DEMO environment. These MUST be removed before production deployment per spec §65.');

    const faculty = await all('SELECT id, employee_id FROM faculty') as { id: number; employee_id: string }[];
    const facultyByEmployeeId = new Map(faculty.map(f => [f.employee_id.toLowerCase(), f.id]));

    const students = await all('SELECT id, student_id FROM students') as { id: number; student_id: string }[];
    const studentsByStudentId = new Map(students.map(s => [s.student_id, s.id]));

    for (const account of DEMO_ACCOUNTS) {
      const envPassword = process.env[account.passwordEnv];
      const password = envPassword && envPassword.length >= 8 ? envPassword : account.passwordFallback;
      const passwordHash = hashPassword(password);

      let resolvedFacultyId: number | undefined;
      let resolvedStudentId: number | undefined;

      if (account.role === 'faculty') {
        resolvedFacultyId = facultyByEmployeeId.get(account.username);
      } else if (account.role === 'student') {
        resolvedStudentId = studentsByStudentId.get(account.username);
      }

      const existingUser = await get('SELECT id FROM users WHERE username = ?', account.username) as { id: number } | undefined;

      if (existingUser) {
        await run('UPDATE users SET password_hash = ?, must_change_password = ?, faculty_id = ?, student_id = ? WHERE id = ?', passwordHash, 1, resolvedFacultyId ?? null, resolvedStudentId ?? null, existingUser.id);
      } else {
        await run('INSERT INTO users (username, password_hash, role, faculty_id, student_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?)', account.username, passwordHash, account.role, resolvedFacultyId ?? null, resolvedStudentId ?? null, 1);
      }
    }
  }

  console.log('Database seeded successfully');
  process.exit(0);
}

seedDatabase().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
