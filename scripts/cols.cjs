const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`
    SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position) AS cols
    FROM information_schema.columns WHERE table_schema = 'csms'
    GROUP BY table_name ORDER BY table_name`);
  r.rows.forEach(x => console.log(x.table_name + ': ' + x.cols));
  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
