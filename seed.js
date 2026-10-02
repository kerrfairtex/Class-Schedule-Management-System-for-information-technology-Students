const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function seed() {
  const client = new Client({
    connectionString: "postgresql://postgres.qqgwnqylngdddtrgrocc:I4McvYBieCJMr273@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?options=search_path%3Dcsms"
  });
  
  await client.connect();
  await client.query('SET search_path TO csms');
  
  async function run(sql, params = []) {
    return await client.query(sql, params);
  }
  
  console.log('Seeding database...');
  
  // 1. Roles
  await run(`INSERT INTO roles (name) VALUES ('admin'), ('faculty'), ('student'), ('public') ON CONFLICT DO NOTHING`);
  
  // 2. Departments
  await run(`INSERT INTO departments (code, name) VALUES ('BSIT', 'Bachelor of Science in Information Technology') ON CONFLICT (code) DO NOTHING`);
  const dept = await run(`SELECT id FROM departments WHERE code = 'BSIT'`);
  const deptId = dept.rows[0].id;
  
  // 3. Programs
  await run(`INSERT INTO programs (department_id, code, name) VALUES ($1, 'BSIT', 'Bachelor of Science in Information Technology') ON CONFLICT (code) DO NOTHING`, [deptId]);
  const prog = await run(`SELECT id FROM programs WHERE code = 'BSIT'`);
  const progId = prog.rows[0].id;
  
  // 4. Academic Years
  await run(`INSERT INTO academic_years (label, start_date, end_date, is_active) VALUES ('2025-2026', '2025-08-01', '2026-05-31', 1) ON CONFLICT DO NOTHING`);
  const ay = await run(`SELECT id FROM academic_years WHERE is_active = 1`);
  const ayId = ay.rows[0].id;
  
  // 5. Semesters
  await run(`INSERT INTO semesters (academic_year_id, name, is_active) VALUES ($1, '1st Semester', 1) ON CONFLICT DO NOTHING`, [ayId]);
  await run(`INSERT INTO semesters (academic_year_id, name, is_active) VALUES ($1, '2nd Semester', 0) ON CONFLICT DO NOTHING`, [ayId]);
  const sem = await run(`SELECT id FROM semesters WHERE is_active = 1`);
  const semId = sem.rows[0].id;
  
  // 6. Buildings
  await run(`INSERT INTO buildings (code, name) VALUES ('ITB', 'IT Building'), ('LAB', 'Computer Laboratory') ON CONFLICT (code) DO NOTHING`);
  const itb = await run(`SELECT id FROM buildings WHERE code = 'ITB'`);
  const lab = await run(`SELECT id FROM buildings WHERE code = 'LAB'`);
  const itbId = itb.rows[0].id;
  const labId = lab.rows[0].id;
  
  // 7. Rooms
  await run(`INSERT INTO rooms (building_id, code, name, capacity) VALUES ($1, 'IT-101', 'IT Lecture Room 1', 50) ON CONFLICT (building_id, code) DO NOTHING`, [itbId]);
  await run(`INSERT INTO rooms (building_id, code, name, capacity) VALUES ($1, 'IT-102', 'IT Lecture Room 2', 45) ON CONFLICT (building_id, code) DO NOTHING`, [itbId]);
  await run(`INSERT INTO rooms (building_id, code, name, capacity) VALUES ($1, 'LAB-1', 'Computer Lab 1', 40) ON CONFLICT (building_id, code) DO NOTHING`, [labId]);
  await run(`INSERT INTO rooms (building_id, code, name, capacity) VALUES ($1, 'LAB-2', 'Computer Lab 2', 35) ON CONFLICT (building_id, code) DO NOTHING`, [labId]);
  
  // 8. Time Slots
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const times = [
    ['07:30', '08:30'], ['08:30', '09:30'], ['09:30', '10:30'], ['10:30', '11:30'],
    ['11:30', '12:30'], ['13:30', '14:30'], ['14:30', '15:30'], ['15:30', '16:30']
  ];
  for (const day of days) {
    for (const [start, end] of times) {
      await run(`INSERT INTO time_slots (day_of_week, start_time, end_time) VALUES ($1, $2, $3) ON CONFLICT (day_of_week, start_time) DO NOTHING`, [day, start, end]);
    }
  }
  
  // 9. Subjects
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
    await run(`INSERT INTO subjects (code, name, credit_hours, program_id) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING`, [code, name, credits, progId]);
  }
  
  // 10. Curriculum
  const mapping = {
    'IT 111': [1, 1], 'IT 112': [1, 1],
    'IT 121': [1, 2], 'IT 122': [1, 2],
    'IT 211': [2, 1], 'IT 212': [2, 1],
    'IT 221': [2, 2], 'IT 222': [2, 2],
  };
  const subs = await run(`SELECT id, code FROM subjects`);
  for (const s of subs.rows) {
    const m = mapping[s.code];
    if (m) {
      await run(`INSERT INTO curriculum (program_id, subject_id, year_level, semester_number) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [progId, s.id, m[0], m[1]]);
    }
  }
  
  // 11. Sections
  await run(`INSERT INTO sections (code, program_id, year_level, semester_id, capacity) VALUES ('BSIT-2A', $1, 2, $2, 45) ON CONFLICT (code) DO NOTHING`, [progId, semId]);
  await run(`INSERT INTO sections (code, program_id, year_level, semester_id, capacity) VALUES ('BSIT-1A', $1, 1, $2, 45) ON CONFLICT (code) DO NOTHING`, [progId, semId]);
  const sec2A = await run(`SELECT id FROM sections WHERE code = 'BSIT-2A'`);
  const sec1A = await run(`SELECT id FROM sections WHERE code = 'BSIT-1A'`);
  const sec2AId = sec2A.rows[0].id;
  const sec1AId = sec1A.rows[0].id;
  
  // 12. Faculty
  const f1 = await run(`INSERT INTO faculty (employee_id, first_name, last_name, email, phone, department_id) VALUES ('FAC-001', 'Maria', 'Santos', 'msantos@trac.edu.ph', '09171234567', $1) ON CONFLICT (employee_id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, phone=EXCLUDED.phone RETURNING id`, [deptId]);
  const f2 = await run(`INSERT INTO faculty (employee_id, first_name, last_name, email, phone, department_id) VALUES ('FAC-002', 'Juan', 'Delgado', 'jdelgado@trac.edu.ph', '09181234567', $1) ON CONFLICT (employee_id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, phone=EXCLUDED.phone RETURNING id`, [deptId]);
  const f3 = await run(`INSERT INTO faculty (employee_id, first_name, last_name, email, phone, department_id) VALUES ('FAC-003', 'Ana', 'Rashid', 'arashid@trac.edu.ph', '09191234567', $1) ON CONFLICT (employee_id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, phone=EXCLUDED.phone RETURNING id`, [deptId]);
  const f1Id = f1.rows[0].id;
  const f2Id = f2.rows[0].id;
  const f3Id = f3.rows[0].id;
  
  // Faculty Subjects
  const facultySubjects = {
    [f1Id]: ['IT 111', 'IT 112'],
    [f2Id]: ['IT 121', 'IT 122', 'IT 211'],
    [f3Id]: ['IT 212', 'IT 221', 'IT 222'],
  };
  for (const [facId, codes] of Object.entries(facultySubjects)) {
    for (const code of codes) {
      const sub = subs.rows.find(s => s.code === code);
      if (sub) {
        await run(`INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [facId, sub.id]);
      }
    }
  }
  
  // 13. Students
  await run(`INSERT INTO students (student_id, first_name, last_name, email, section_id) VALUES ('2022-0001', 'Demo', 'Student', 'demo.student@trac.edu.ph', $1) ON CONFLICT (student_id) DO NOTHING`, [sec2AId]);
  await run(`INSERT INTO students (student_id, first_name, last_name, email, section_id) VALUES ('2023-0001', 'Sample', 'Enrollee', 'sample.enrollee@trac.edu.ph', $1) ON CONFLICT (student_id) DO NOTHING`, [sec1AId]);
  const stu1 = await run(`SELECT id FROM students WHERE student_id = '2022-0001'`);
  const stu2 = await run(`SELECT id FROM students WHERE student_id = '2023-0001'`);
  const stu1Id = stu1.rows[0].id;
  const stu2Id = stu2.rows[0].id;
  
  // 14. Users (Demo Accounts)
  const DEMO_ACCOUNTS = [
    { username: 'admin', role: 'admin', faculty_id: null, student_id: null, password: 'admin123' },
    { username: 'fac-001', role: 'faculty', faculty_id: f1Id, student_id: null, password: 'faculty123' },
    { username: 'fac-002', role: 'faculty', faculty_id: f2Id, student_id: null, password: 'faculty123' },
    { username: 'fac-003', role: 'faculty', faculty_id: f3Id, student_id: null, password: 'faculty123' },
    { username: '2022-0001', role: 'student', faculty_id: null, student_id: stu1Id, password: 'student123' },
    { username: '2023-0001', role: 'student', faculty_id: null, student_id: stu2Id, password: 'student123' },
  ];
  
  for (const acc of DEMO_ACCOUNTS) {
    const passwordHash = bcrypt.hashSync(acc.password, 10);
    await run(`
      INSERT INTO users (username, password_hash, role, faculty_id, student_id, must_change_password)
      VALUES ($1, $2, $3, $4, $5, 1)
      ON CONFLICT (username) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        faculty_id = EXCLUDED.faculty_id,
        student_id = EXCLUDED.student_id,
        must_change_password = EXCLUDED.must_change_password
    `, [acc.username, passwordHash, acc.role, acc.faculty_id, acc.student_id]);
  }
  
  // 15. Evidence layer - Sources (auto-generated SERIAL ids)
  const sourceIds = {};
  const sources = [
    { title: 'TRAC Official Website', source_type: 'official_website', authority_level: 5, publisher: 'Tawi-Tawi Regional Agricultural College', url: 'https://trac.edu.ph', document_date: null, accessed_at: '2026-08-31', status: 'ACTIVE', notes: 'Official institutional website' },
    { title: 'CMO No. 14 s. 2017 - BSIT Policy', source_type: 'government_regulation', authority_level: 5, publisher: 'Commission on Higher Education (CHED)', url: 'https://ched.gov.ph/cmo-14-s-2017/', document_date: '2017-06-01', accessed_at: '2026-08-31', status: 'ACTIVE', notes: 'BSIT program standards' },
    { title: 'Republic Act 8650 - TRAC Charter', source_type: 'law', authority_level: 5, publisher: 'Republic of the Philippines', url: 'https://www.officialgazette.gov.ph/1998/06/11/republic-act-no-8650/', document_date: '1998-06-11', accessed_at: '2026-08-31', status: 'ACTIVE', notes: 'TRAC legal foundation' },
  ];
  for (const s of sources) {
    const res = await run(`
      INSERT INTO sources (title, source_type, authority_level, publisher, url, document_date, accessed_at, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [s.title, s.source_type, s.authority_level, s.publisher, s.url, s.document_date, s.accessed_at, s.status, s.notes]);
    sourceIds[s.title] = res.rows[0].id;
  }
  
  // 16. Institutional Facts
  const facts = [
    { category: 'institution', key: 'legal_name', value: 'Tawi-Tawi Regional Agricultural College', value_type: 'string', status: 'VERIFIED', confidence: 100, effective_from: '1983-01-01', verified_at: '2026-08-31', review_due_at: '2027-08-31', notes: 'Per RA 8650', sourceTitle: 'Republic Act 8650 - TRAC Charter' },
    { category: 'institution', key: 'location', value: 'Nalil, Bongao, Tawi-Tawi, Philippines', value_type: 'string', status: 'VERIFIED', confidence: 100, effective_from: '1983-01-01', verified_at: '2026-08-31', review_due_at: '2027-08-31', notes: 'Per TRAC website', sourceTitle: 'TRAC Official Website' },
    { category: 'institution', key: 'established', value: '1983', value_type: 'date', status: 'VERIFIED', confidence: 100, effective_from: '1983-01-01', verified_at: '2026-08-31', review_due_at: '2027-08-31', notes: 'Per RA 8650', sourceTitle: 'Republic Act 8650 - TRAC Charter' },
    { category: 'institution', key: 'website', value: 'https://trac.edu.ph', value_type: 'string', status: 'VERIFIED', confidence: 100, effective_from: null, verified_at: '2026-08-31', review_due_at: '2027-08-31', notes: 'Official website', sourceTitle: 'TRAC Official Website' },
    { category: 'program', key: 'bsit_offering', value: 'Bachelor of Science in Information Technology (BSIT)', value_type: 'string', status: 'VERIFIED', confidence: 100, effective_from: null, verified_at: '2026-08-31', review_due_at: '2027-08-31', notes: 'Per CMO 14 s. 2017', sourceTitle: 'CMO No. 14 s. 2017 - BSIT Policy' },
    { category: 'organization', key: 'institute_of_computing_studies', value: 'Institute of Computing Studies', value_type: 'string', status: 'VERIFIED', confidence: 100, effective_from: null, verified_at: '2026-08-31', review_due_at: '2027-08-31', notes: 'Per TRAC website', sourceTitle: 'TRAC Official Website' },
    { category: 'institution', key: 'mission', value: 'To provide quality education and produce globally competitive graduates', value_type: 'string', status: 'VERIFIED', confidence: 90, effective_from: null, verified_at: '2026-08-31', review_due_at: '2027-08-31', notes: 'Per TRAC website', sourceTitle: 'TRAC Official Website' },
    { category: 'institution', key: 'vision', value: 'A leading center of excellence in agriculture, fisheries, and technology in the Bangsamoro', value_type: 'string', status: 'VERIFIED', confidence: 90, effective_from: null, verified_at: '2026-08-31', review_due_at: '2027-08-31', notes: 'Per TRAC website', sourceTitle: 'TRAC Official Website' },
    { category: 'institution', key: 'four_fold_thrust', value: 'Instruction, Research, Extension, Production', value_type: 'string', status: 'VERIFIED', confidence: 90, effective_from: null, verified_at: '2026-08-31', review_due_at: '2027-08-31', notes: 'Per TRAC website', sourceTitle: 'TRAC Official Website' },
  ];
  
  const factIds = {};
  for (const f of facts) {
    const factRes = await run(`
      INSERT INTO institutional_facts (category, key, value, value_type, status, confidence, effective_from, verified_at, review_due_at, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [f.category, f.key, f.value, f.value_type, f.status, f.confidence, f.effective_from, f.verified_at, f.review_due_at, f.notes]);
    const factId = factRes.rows[0].id;
    factIds[f.key] = factId;
    
    const sourceId = sourceIds[f.sourceTitle];
    if (sourceId) {
      await run(`
        INSERT INTO fact_sources (fact_id, source_id, supports) VALUES ($1, $2, 1)
        ON CONFLICT DO NOTHING
      `, [factId, sourceId]);
      await run(`
        INSERT INTO verification_records (fact_id, verified_by, verified_at, verification_method, source_count, authority_level, next_review_date)
        VALUES ($1, 'csms-developer-team', $2, 'manual-review-of-source', 1, 5, $3)
        ON CONFLICT DO NOTHING
      `, [factId, f.verified_at, f.review_due_at]);
    }
  }
  
  // 17. Institution Contacts
  const contacts = [
    ['Office of the College President', 'email', 'op@trac.edu.ph', null, 1, sourceIds['TRAC Official Website'], '2026-08-31'],
    ['Office of the College Registrar', 'email', 'registrar@trac.edu.ph', null, 1, sourceIds['TRAC Official Website'], '2026-08-31'],
    ['Office of Admission', 'email', 'admission@trac.edu.ph', null, 1, sourceIds['TRAC Official Website'], '2026-08-31'],
    ['Office of Admission', 'mobile', '0951-733-7474', null, 1, sourceIds['TRAC Official Website'], '2026-08-31'],
  ];
  for (const c of contacts) {
    await run(`
      INSERT INTO institution_contacts (office, contact_type, value, label, is_primary, source_id, verified_at, data_environment)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'VERIFIED')
      ON CONFLICT DO NOTHING
    `, c);
  }
  
  // 18. Officials
  const officials = [
    ['College President', 'Sitti Amina', 'J.', 'Mohammad', 'SUC President I', sourceIds['TRAC Official Website'], 'PENDING_VERIFICATION'],
    ['Vice President for Academic Affairs', 'Al-Ghazier', 'H.', 'Kandon', 'Ph.D.', sourceIds['TRAC Official Website'], 'PENDING_VERIFICATION'],
    ['Dean of Institute of Computing Studies', 'Abubakar', 'M.', 'Hiyang', 'MIT', sourceIds['TRAC Official Website'], 'PENDING_VERIFICATION'],
    ['Dean of Admission', 'Alnalyn', 'K.', 'Saral', 'Ed.D.', sourceIds['TRAC Official Website'], 'PENDING_VERIFICATION'],
  ];
  for (const o of officials) {
    await run(`
      INSERT INTO officials (position, first_name, middle_name, last_name, title, source_id, status, data_environment)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'DEMO')
      ON CONFLICT DO NOTHING
    `, o);
  }
  
  // 19. System Settings
  await run(`INSERT INTO system_settings (key, value, description, updated_by) VALUES ('system_status', 'DEVELOPMENT', 'Per spec §47: not yet formally institutionally adopted.', 'csms-developer-team') ON CONFLICT (key) DO NOTHING`);
  await run(`INSERT INTO system_settings (key, value, description, updated_by) VALUES ('data_environment', 'DEMO', 'Per spec §64: development fixtures, never authoritative.', 'csms-developer-team') ON CONFLICT (key) DO NOTHING`);
  await run(`INSERT INTO system_settings (key, value, description, updated_by) VALUES ('verification_baseline', '2026-08-31', 'Date when source-of-truth baseline was established.', 'csms-developer-team') ON CONFLICT (key) DO NOTHING`);
  
  console.log('Seeding complete!');
  
  await client.end();
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
