#!/usr/bin/env node
/**
 * Set the demo account passwords to the values in the environment.
 *
 * The demo accounts (admin, fac-001..003, 2022-0001, 2023-0001) are seeded
 * by scripts/seed-production.ts. This script re-applies their passwords
 * from ADMIN_PASSWORD / FACULTY_PASSWORD.
 *
 * Safety rules
 * ------------
 * - In production it does nothing unless CSMS_SYNC_DEMO_PASSWORDS=1 is set.
 *   It used to run on every Render start and silently overwrote any password
 *   those users had changed. A skip exits 0 so a start command that chains
 *   it (`... && npm run start`) still boots the app.
 * - There are no built-in fallback passwords. An account whose env var is
 *   missing or shorter than 8 characters is skipped, never reset to a default.
 * - Every table is schema-qualified (csms.*) so it cannot touch another
 *   app's tables in the shared database, even behind a transaction pooler.
 *
 * Usage: CSMS_SYNC_DEMO_PASSWORDS=1 node scripts/sync-demo-passwords.cjs
 * Env:   DATABASE_URL (required), ADMIN_PASSWORD, FACULTY_PASSWORD,
 *        CSMS_SYNC_DEMO_PASSWORDS=1 (required in production),
 *        SEED_DEFAULT_USERS=0 disables the sync entirely.
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

const DEMO_ACCOUNTS = [
  { username: 'admin', role: 'admin', env: 'ADMIN_PASSWORD' },
  { username: 'fac-001', role: 'faculty', env: 'FACULTY_PASSWORD' },
  { username: 'fac-002', role: 'faculty', env: 'FACULTY_PASSWORD' },
  { username: 'fac-003', role: 'faculty', env: 'FACULTY_PASSWORD' },
];

function log(message) {
  console.log(`[sync-demo-passwords] ${message}`);
}

async function main() {
  if (process.env.SEED_DEFAULT_USERS === '0') {
    log('SEED_DEFAULT_USERS=0 - skipped.');
    return;
  }
  if (process.env.NODE_ENV === 'production' && process.env.CSMS_SYNC_DEMO_PASSWORDS !== '1') {
    log('production and CSMS_SYNC_DEMO_PASSWORDS is not 1 - skipped, no passwords changed.');
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
    for (const account of DEMO_ACCOUNTS) {
      const password = process.env[account.env];
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        log(`${account.username}: ${account.env} missing or under ${MIN_PASSWORD_LENGTH} chars - skipped.`);
        continue;
      }
      const hash = bcrypt.hashSync(password, SALT_ROUNDS);

      const faculty = account.role === 'faculty'
        ? await client.query('SELECT id FROM csms.faculty WHERE LOWER(employee_id) = LOWER($1) LIMIT 1', [account.username])
        : { rows: [] };

      const facultyId = faculty.rows[0] ? faculty.rows[0].id : null;
      const studentId = null; // students have no accounts

      const existing = await client.query('SELECT id FROM csms.users WHERE LOWER(username) = LOWER($1) LIMIT 1', [account.username]);

      if (existing.rows[0]) {
        await client.query(
          `UPDATE csms.users
              SET password_hash = $1,
                  role = $2,
                  faculty_id = $3,
                  student_id = $4,
                  must_change_password = 0,
                  is_active = 1
            WHERE id = $5`,
          [hash, account.role, facultyId, studentId, existing.rows[0].id]
        );
        log(`updated ${account.username} (user id ${existing.rows[0].id})`);
      } else {
        await client.query(
          `INSERT INTO csms.users (username, password_hash, role, faculty_id, student_id, must_change_password, is_active)
           VALUES ($1, $2, $3, $4, $5, 0, 1)`,
          [account.username.toLowerCase(), hash, account.role, facultyId, studentId]
        );
        log(`created ${account.username}`);
      }
    }
    log('done.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[sync-demo-passwords] failed:', err.message);
  process.exit(1);
});
