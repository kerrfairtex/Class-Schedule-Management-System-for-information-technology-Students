const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query('SET search_path TO csms');
  const t = await c.query(`SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema='csms' AND ((table_name='academic_years' AND column_name IN ('start_date','end_date','is_active'))
    OR (table_name='semesters' AND column_name='is_active'))`);
  console.log(t.rows.map(r => `${r.table_name}.${r.column_name}: ${r.data_type}`).join('\n'));
  for (const [n, q] of [
    ['calendar', 'SELECT id,label,start_date,end_date,is_active FROM academic_years ORDER BY id DESC'],
    ['conflicts-sem', 'SELECT id,name FROM semesters WHERE is_active = 1'],
    ['about', "SELECT key,value,status FROM institutional_facts WHERE category IN ('institution','identity','organization','programs')"],
  ]) {
    try { const r = await c.query(q); console.log(n, 'OK rows:', r.rows.length, r.rows[0] ? JSON.stringify(r.rows[0]) : ''); }
    catch (e) { console.log(n, 'FAILED:', e.message); }
  }
  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
