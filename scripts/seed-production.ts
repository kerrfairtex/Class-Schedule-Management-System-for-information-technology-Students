import bcrypt from 'bcryptjs';
import { Client } from 'pg';

async function seedProduction() {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.ebyepweqwihdvjecrufk',
    password: '4n=AgYHXO?%ESEKv'
  });

  await client.connect();
  await client.query('SET search_path TO csms');

  const DEMO_ACCOUNTS = [
    { username: 'admin', role: 'admin', faculty_id: null, student_id: null, password: 'admin123' },
    { username: 'fac-001', role: 'faculty', faculty_id: 1, student_id: null, password: 'faculty123' },
    { username: 'fac-002', role: 'faculty', faculty_id: 2, student_id: null, password: 'faculty123' },
    { username: 'fac-003', role: 'faculty', faculty_id: 3, student_id: null, password: 'faculty123' },
    { username: '2022-0001', role: 'student', faculty_id: null, student_id: 1, password: 'student123' },
    { username: '2023-0001', role: 'student', faculty_id: null, student_id: 2, password: 'student123' },
  ];

  for (const acc of DEMO_ACCOUNTS) {
    const passwordHash = bcrypt.hashSync(acc.password, 10);
    await client.query(`
      INSERT INTO users (username, password_hash, role, faculty_id, student_id, must_change_password)
      VALUES ($1, $2, $3, $4, $5, 1)
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        must_change_password = 1,
        faculty_id = EXCLUDED.faculty_id,
        student_id = EXCLUDED.student_id
    `, [acc.username, passwordHash, acc.role, acc.faculty_id, acc.student_id]);
    console.log('Created/updated user:', acc.username);
  }

  console.log('Demo users seeded');
  await client.end();
  process.exit(0);
}

seedProduction().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
