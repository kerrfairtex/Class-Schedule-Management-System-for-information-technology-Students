const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query('SET search_path TO csms');
  const r = await c.query(`SELECT f.id, f.employee_id, f.first_name, f.last_name, f.email, f.phone,
    f.data_environment, d.code AS dept_code,
    (SELECT string_agg(sub.code, ', ') FROM faculty_subjects fs JOIN subjects sub ON sub.id = fs.subject_id WHERE fs.faculty_id = f.id) AS subjects
    FROM faculty f JOIN departments d ON d.id = f.department_id ORDER BY f.last_name, f.first_name`);
  console.log('OK rows:', r.rows.length);
  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
