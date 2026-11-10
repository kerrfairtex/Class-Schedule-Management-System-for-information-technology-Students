#!/usr/bin/env node
/**
 * Sync the demo account passwords to the values in the environment.
 *
 * Why this exists
 * ---------------
 * The demo accounts (admin, fac-001..003, 2022-0001, 2023-0001) are seeded
 * by scripts/seed-production.ts, but that script only ran once. Later
 * deploys never refreshed the password hashes, so the documented test
 * logins (fac-001/faculty123, 2022-0001/student123) stopped working even
 * though Render still has FACULTY_PASSWORD / STUDENT_PASSWORD set.
 *
 * This script is deliberately narrow: it ONLY touches the password_hash,
 * must_change_password, faculty_id and student_id of the six demo users.
 * It never inserts or deletes rows of any other table, so it is safe to
 * run on every deploy.
 *
 * Usage: node scripts/sync-demo-passwords.cjs
 * Env:   DATABASE_URL (required), ADMIN_PASSWORD, FACULTY_PASSWORD,
 *        STUDENT_PASSWORD (optional, defaults below), SEED_DEFAULT_USERS=0
 *        disables the sync entirely.
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const DEMO_ACCOUNTS = [
  { username: 'admin', role: 'admin', env: 'ADMIN_PASSWORD', fallback: 'admin123' },
  { username: 'fac-001', role: 'faculty', env: 'FACULTY_PASSWORD', fallback: 'faculty123' },
  { username: 'fac-002', role: 'faculty', env: 'FACULTY_PASSWORD', fallback: 'faculty123' },
  { username: 'fac-003', role: 'faculty', env: 'FACULTY_PASSWORD', fallback: 'faculty123' },
  { username: '2022-0001', role: 'student', env: 'STUDENT_PASSWORD', fallback: 'student123' },
  { username: '2023-0001', role: 'student', env: 'STUDENT_PASSWORD', fallback: 'student123' },
];

function resolvePassword(envKey, fallback) {
  const value = process.env[envKey];
  if (value && value.length >= 8) return value;
  return fallback;
}

async function main() {
  if (process.env.SEED_DEFAULT_USERS === '0') {
    console.log('[sync-demo-passwords] SEED_DEFAULT_USERS=0 - skipped.');
    return;
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[sync-demo-passwords] DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // The app uses the `csms` schema; make sure we operate on the same one.
    await client.query('SET search_path TO csms');

    for (const account of DEMO_ACCOUNTS) {
      const password = resolvePassword(account.env, account.fallback);
      const hash = bcrypt.hashSync(password, SALT_ROUNDS);

      const faculty = account.role === 'faculty'
        ? await client.query('SELECT id FROM faculty WHERE LOWER(employee_id) = LOWER($1) LIMIT 1', [account.username])
        : { rows: [] };
      const student = account.role === 'student'
        ? await client.query('SELECT id FROM students WHERE student_id = $1 LIMIT 1', [account.username])
        : { rows: [] };

      const facultyId = faculty.rows[0] ? faculty.rows[0].id : null;
      const studentId = student.rows[0] ? student.rows[0].id : null;

      const existing = await client.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [account.username]);

      if (existing.rows[0]) {
        await client.query(
          `UPDATE users
              SET password_hash = $1,
                  role = $2,
                  faculty_id = $3,
                  student_id = $4,
                  must_change_password = 0,
                  is_active = 1
            WHERE id = $5`,
          [hash, account.role, facultyId, studentId, existing.rows[0].id]
        );
        console.log(`[sync-demo-passwords] updated ${account.username} (user id ${existing.rows[0].id})`);
      } else {
        await client.query(
          `INSERT INTO users (username, password_hash, role, faculty_id, student_id, must_change_password, is_active)
           VALUES ($1, $2, $3, $4, $5, 0, 1)`,
          [account.username.toLowerCase(), hash, account.role, facultyId, studentId]
        );
        console.log(`[sync-demo-passwords] created ${account.username}`);
      }
    }
    console.log('[sync-demo-passwords] done.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[sync-demo-passwords] failed:', err.message);
  process.exit(1);
});
