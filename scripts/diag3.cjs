const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query('SET search_path TO csms');
  try {
    const r = await c.query("SELECT id, category, key, value, status, confidence, verified_at, review_due_at, NULL::text AS source_id FROM institutional_facts ORDER BY status, category, key");
    console.log('OK rows:', r.rows.length);
  } catch (e) { console.log('FAILED:', e.message); }
  await c.end();
})();
