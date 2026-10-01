import { NextResponse } from 'next/server';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

export async function POST(request: Request) {
  if (!DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const seedToken = process.env.SEED_TOKEN;
  // Fail closed: require a matching x-seed-token header in ALL environments
  // unless SEED_TOKEN is explicitly set to 'disable' for local dev.
  if (seedToken !== 'disable' && request.headers.get('x-seed-token') !== seedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    
    // Create csms schema
    await client.query('CREATE SCHEMA IF NOT EXISTS csms');
    await client.query('SET search_path TO csms');
    
    // Create all CSMS tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS csms.roles (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS csms.departments (id SERIAL PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS csms.programs (id SERIAL PRIMARY KEY, department_id INTEGER NOT NULL REFERENCES csms.departments(id), code TEXT UNIQUE NOT NULL, name TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS csms.academic_years (id SERIAL PRIMARY KEY, label TEXT NOT NULL, start_date TEXT, end_date TEXT, is_active INTEGER DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS csms.semesters (id SERIAL PRIMARY KEY, academic_year_id INTEGER NOT NULL REFERENCES csms.academic_years(id), name TEXT NOT NULL, is_active INTEGER DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS csms.buildings (id SERIAL PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS csms.rooms (id SERIAL PRIMARY KEY, building_id INTEGER NOT NULL REFERENCES csms.buildings(id), code TEXT NOT NULL, name TEXT NOT NULL, capacity INTEGER NOT NULL DEFAULT 40, UNIQUE(building_id, code))`,
      `CREATE TABLE IF NOT EXISTS csms.subjects (id SERIAL PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, credit_hours INTEGER NOT NULL DEFAULT 3, program_id INTEGER NOT NULL REFERENCES csms.programs(id))`,
      `CREATE TABLE IF NOT EXISTS csms.curriculum (id SERIAL PRIMARY KEY, program_id INTEGER NOT NULL REFERENCES csms.programs(id), subject_id INTEGER NOT NULL REFERENCES csms.subjects(id), year_level INTEGER NOT NULL, semester_number INTEGER NOT NULL, UNIQUE(program_id, subject_id, year_level, semester_number))`,
      `CREATE TABLE IF NOT EXISTS csms.sections (id SERIAL PRIMARY KEY, code TEXT UNIQUE NOT NULL, program_id INTEGER NOT NULL REFERENCES csms.programs(id), year_level INTEGER NOT NULL, semester_id INTEGER NOT NULL REFERENCES csms.semesters(id), capacity INTEGER NOT NULL DEFAULT 40)`,
      `CREATE TABLE IF NOT EXISTS csms.faculty (id SERIAL PRIMARY KEY, employee_id TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT, phone TEXT, department_id INTEGER NOT NULL REFERENCES csms.departments(id))`,
      `CREATE TABLE IF NOT EXISTS csms.students (id SERIAL PRIMARY KEY, student_id TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT, section_id INTEGER NOT NULL REFERENCES csms.sections(id))`,
      `CREATE TABLE IF NOT EXISTS csms.time_slots (id SERIAL PRIMARY KEY, day_of_week TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, UNIQUE(day_of_week, start_time))`,
      `CREATE TABLE IF NOT EXISTS csms.faculty_availability (id SERIAL PRIMARY KEY, faculty_id INTEGER NOT NULL REFERENCES csms.faculty(id), time_slot_id INTEGER NOT NULL REFERENCES csms.time_slots(id), is_available INTEGER DEFAULT 1, UNIQUE(faculty_id, time_slot_id))`,
      `CREATE TABLE IF NOT EXISTS csms.faculty_subjects (faculty_id INTEGER NOT NULL REFERENCES csms.faculty(id), subject_id INTEGER NOT NULL REFERENCES csms.subjects(id), PRIMARY KEY (faculty_id, subject_id))`,
      `CREATE TABLE IF NOT EXISTS csms.users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'scheduler', 'faculty', 'student', 'public')), faculty_id INTEGER REFERENCES csms.faculty(id), student_id INTEGER REFERENCES csms.students(id), is_active INTEGER DEFAULT 1, must_change_password INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS csms.schedules (id SERIAL PRIMARY KEY, section_id INTEGER NOT NULL REFERENCES csms.sections(id), subject_id INTEGER NOT NULL REFERENCES csms.subjects(id), faculty_id INTEGER NOT NULL REFERENCES csms.faculty(id), room_id INTEGER NOT NULL REFERENCES csms.rooms(id), time_slot_id INTEGER NOT NULL REFERENCES csms.time_slots(id), semester_id INTEGER NOT NULL REFERENCES csms.semesters(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT 'DRAFT', published_at TEXT, approved_by TEXT)`,
      `CREATE TABLE IF NOT EXISTS csms.audit_logs (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES csms.users(id), action TEXT NOT NULL, entity_type TEXT, entity_id INTEGER, details TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE INDEX IF NOT EXISTS idx_schedules_faculty ON csms.schedules(faculty_id, time_slot_id)`,
      `CREATE INDEX IF NOT EXISTS idx_schedules_room ON csms.schedules(room_id, time_slot_id)`,
      `CREATE INDEX IF NOT EXISTS idx_schedules_section ON csms.schedules(section_id, time_slot_id)`,
      `CREATE INDEX IF NOT EXISTS idx_schedules_semester ON csms.schedules(semester_id)`,
    ];
    
    for (const table of tables) {
      await client.query(table);
    }
    
    // Seed basic data
    await client.query(`INSERT INTO csms.departments (code, name) VALUES ('BSIT', 'Bachelor of Science in Information Technology') ON CONFLICT (code) DO NOTHING`);
    const deptResult = await client.query(`SELECT id FROM csms.departments WHERE code = 'BSIT'`);
    const deptId = deptResult.rows[0].id;
    
    await client.query(`INSERT INTO csms.programs (department_id, code, name) VALUES ($1, 'BSIT', 'Bachelor of Science in Information Technology') ON CONFLICT (code) DO NOTHING`, [deptId]);
    const progResult = await client.query(`SELECT id FROM csms.programs WHERE code = 'BSIT'`);
    const progId = progResult.rows[0].id;
    
    await client.query(`INSERT INTO csms.academic_years (label, start_date, end_date, is_active) VALUES ('2025-2026', '2025-08-01', '2026-05-31', 1) ON CONFLICT DO NOTHING`);
    const ayResult = await client.query(`SELECT id FROM csms.academic_years WHERE is_active = 1`);
    const ayId = ayResult.rows[0].id;
    
    await client.query(`INSERT INTO csms.semesters (academic_year_id, name, is_active) VALUES ($1, '1st Semester', 1) ON CONFLICT DO NOTHING`, [ayId]);
    await client.query(`INSERT INTO csms.semesters (academic_year_id, name, is_active) VALUES ($1, '2nd Semester', 0) ON CONFLICT DO NOTHING`, [ayId]);
    const semResult = await client.query(`SELECT id FROM csms.semesters WHERE is_active = 1`);
    const semId = semResult.rows[0].id;
    
    await client.query(`INSERT INTO csms.buildings (code, name) VALUES ('ITB', 'IT Building') ON CONFLICT (code) DO NOTHING`);
    await client.query(`INSERT INTO csms.buildings (code, name) VALUES ('LAB', 'Computer Laboratory') ON CONFLICT (code) DO NOTHING`);
    const itbResult = await client.query(`SELECT id FROM csms.buildings WHERE code = 'ITB'`);
    const labResult = await client.query(`SELECT id FROM csms.buildings WHERE code = 'LAB'`);
    const itbId = itbResult.rows[0].id;
    const labId = labResult.rows[0].id;
    
    await client.query(`INSERT INTO csms.rooms (building_id, code, name, capacity) VALUES ($1, 'IT-101', 'IT Lecture Room 1', 50) ON CONFLICT (building_id, code) DO NOTHING`, [itbId]);
    await client.query(`INSERT INTO csms.rooms (building_id, code, name, capacity) VALUES ($1, 'IT-102', 'IT Lecture Room 2', 45) ON CONFLICT (building_id, code) DO NOTHING`, [itbId]);
    await client.query(`INSERT INTO csms.rooms (building_id, code, name, capacity) VALUES ($1, 'LAB-1', 'Computer Lab 1', 40) ON CONFLICT (building_id, code) DO NOTHING`, [labId]);
    await client.query(`INSERT INTO csms.rooms (building_id, code, name, capacity) VALUES ($1, 'LAB-2', 'Computer Lab 2', 35) ON CONFLICT (building_id, code) DO NOTHING`, [labId]);
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const times = [['07:00', '08:00'], ['08:00', '09:00'], ['09:00', '10:00'], ['10:00', '11:00'], ['11:00', '12:00'], ['12:00', '13:00'], ['13:00', '14:00'], ['14:00', '15:00'], ['15:00', '16:00'], ['16:00', '17:00'], ['17:00', '18:00'], ['18:00', '19:00']];
    for (const day of days) {
      for (const [start, end] of times) {
        await client.query(`INSERT INTO csms.time_slots (day_of_week, start_time, end_time) VALUES ($1, $2, $3) ON CONFLICT (day_of_week, start_time) DO NOTHING`, [day, start, end]);
      }
    }
    
    const subjects = [['IT 111', 'Introduction to Computing', 3], ['IT 112', 'Computer Programming 1', 3], ['IT 121', 'Data Structures and Algorithms', 3], ['IT 122', 'Database Management Systems', 3], ['IT 211', 'Web Systems and Technologies', 3], ['IT 212', 'Systems Analysis and Design', 3], ['IT 221', 'Software Engineering', 3], ['IT 222', 'Networking 1', 3]];
    for (const [code, name, credits] of subjects) {
      await client.query(`INSERT INTO csms.subjects (code, name, credit_hours, program_id) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING`, [code, name, credits, progId]);
    }
    
    const mapping = {'IT 111': [1, 1], 'IT 112': [1, 1], 'IT 121': [1, 2], 'IT 122': [1, 2], 'IT 211': [2, 1], 'IT 212': [2, 1], 'IT 221': [2, 2], 'IT 222': [2, 2]};
    for (const [code, [yr, sem]] of Object.entries(mapping)) {
      const subResult = await client.query(`SELECT id FROM csms.subjects WHERE code = $1`, [code]);
      if (subResult.rows.length > 0) {
        await client.query(`INSERT INTO csms.curriculum (program_id, subject_id, year_level, semester_number) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [progId, subResult.rows[0].id, yr, sem]);
      }
    }
    
    await client.query(`INSERT INTO csms.sections (code, program_id, year_level, semester_id, capacity) VALUES ('BSIT-2A', $1, 2, $2, 45) ON CONFLICT (code) DO NOTHING`, [progId, semId]);
    await client.query(`INSERT INTO csms.sections (code, program_id, year_level, semester_id, capacity) VALUES ('BSIT-1A', $1, 1, $2, 45) ON CONFLICT (code) DO NOTHING`, [progId, semId]);
    const sec2aResult = await client.query(`SELECT id FROM csms.sections WHERE code = 'BSIT-2A'`);
    const sec1aResult = await client.query(`SELECT id FROM csms.sections WHERE code = 'BSIT-1A'`);
    const sec2aId = sec2aResult.rows[0].id;
    const sec1aId = sec1aResult.rows[0].id;
    
    await client.query(`INSERT INTO csms.faculty (employee_id, first_name, last_name, email, phone, department_id) VALUES ('FAC-001', 'Maria', 'Santos', 'msantos@trac.edu.ph', '09171234567', $1) ON CONFLICT (employee_id) DO NOTHING`, [deptId]);
    await client.query(`INSERT INTO csms.faculty (employee_id, first_name, last_name, email, phone, department_id) VALUES ('FAC-002', 'Juan', 'Delgado', 'jdelgado@trac.edu.ph', '09181234567', $1) ON CONFLICT (employee_id) DO NOTHING`, [deptId]);
    await client.query(`INSERT INTO csms.faculty (employee_id, first_name, last_name, email, phone, department_id) VALUES ('FAC-003', 'Ana', 'Rashid', 'arashid@trac.edu.ph', '09191234567', $1) ON CONFLICT (employee_id) DO NOTHING`, [deptId]);
    const f1Result = await client.query(`SELECT id FROM csms.faculty WHERE employee_id = 'FAC-001'`);
    const f2Result = await client.query(`SELECT id FROM csms.faculty WHERE employee_id = 'FAC-002'`);
    const f3Result = await client.query(`SELECT id FROM csms.faculty WHERE employee_id = 'FAC-003'`);
    const f1Id = f1Result.rows[0].id;
    const f2Id = f2Result.rows[0].id;
    const f3Id = f3Result.rows[0].id;
    
    const facultySubjects = { [f1Id]: ['IT 111', 'IT 112'], [f2Id]: ['IT 121', 'IT 122', 'IT 211'], [f3Id]: ['IT 212', 'IT 221', 'IT 222'] };
    for (const [facId, codes] of Object.entries(facultySubjects)) {
      for (const code of codes) {
        const subResult = await client.query(`SELECT id FROM csms.subjects WHERE code = $1`, [code]);
        if (subResult.rows.length > 0) {
          await client.query(`INSERT INTO csms.faculty_subjects (faculty_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [facId, subResult.rows[0].id]);
        }
      }
    }
    
    await client.query(`INSERT INTO csms.students (student_id, first_name, last_name, email, section_id) VALUES ('2022-0001', 'Demo', 'Student', 'demo.student@trac.edu.ph', $1) ON CONFLICT (student_id) DO NOTHING`, [sec2aId]);
    await client.query(`INSERT INTO csms.students (student_id, first_name, last_name, email, section_id) VALUES ('2023-0001', 'Sample', 'Enrollee', 'sample.enrollee@trac.edu.ph', $1) ON CONFLICT (student_id) DO NOTHING`, [sec1aId]);
    const s1Result = await client.query(`SELECT id FROM csms.students WHERE student_id = '2022-0001'`);
    const s2Result = await client.query(`SELECT id FROM csms.students WHERE student_id = '2023-0001'`);
    const s1Id = s1Result.rows[0].id;
    const s2Id = s2Result.rows[0].id;
    
    const demoUsers = [
      { username: 'admin', role: 'admin', faculty_id: null, student_id: null, password: 'admin123' },
      { username: 'fac-001', role: 'faculty', faculty_id: f1Id, student_id: null, password: 'faculty123' },
      { username: 'fac-002', role: 'faculty', faculty_id: f2Id, student_id: null, password: 'faculty123' },
      { username: 'fac-003', role: 'faculty', faculty_id: f3Id, student_id: null, password: 'faculty123' },
      { username: '2022-0001', role: 'student', faculty_id: null, student_id: s1Id, password: 'student123' },
      { username: '2023-0001', role: 'student', faculty_id: null, student_id: s2Id, password: 'student123' },
    ];
    
    for (const user of demoUsers) {
      const passwordHash = bcrypt.hashSync(user.password, 10);
      await client.query(`
        INSERT INTO csms.users (username, password_hash, role, faculty_id, student_id, must_change_password)
        VALUES ($1, $2, $3, $4, $5, 0)
        ON CONFLICT (username) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          must_change_password = 0,
          faculty_id = EXCLUDED.faculty_id,
          student_id = EXCLUDED.student_id
      `, [user.username, passwordHash, user.role, user.faculty_id, user.student_id]);
    }
    
    await client.end();
    
    return NextResponse.json({ success: true, message: 'Database seeded successfully!' });
  } catch (error) {
    await client.end();
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
