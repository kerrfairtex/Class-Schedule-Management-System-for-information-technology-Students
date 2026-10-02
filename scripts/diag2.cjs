const { Client } = require('pg');
const tests = {
  'evidence-facts': "SELECT id, category, key, value, status, confidence, verified_at, review_due_at, source_id FROM institutional_facts ORDER BY status, category, key",
  'evidence-overdue': "SELECT COUNT(*) as c FROM institutional_facts WHERE review_due_at IS NOT NULL AND review_due_at < CURRENT_DATE::text",
  'schedules-list': "SELECT s.id, s.status, s.published_at, s.approved_by, sub.code, sub.name, f.first_name || ' ' || f.last_name AS faculty_name, r.code, r.capacity, sec.code, sec.capacity, ts.day_of_week, ts.start_time, ts.end_time, sec.data_environment, r.data_environment AS room_de FROM schedules s JOIN subjects sub ON sub.id = s.subject_id JOIN faculty f ON f.id = s.faculty_id JOIN rooms r ON r.id = s.room_id JOIN sections sec ON sec.id = s.section_id JOIN time_slots ts ON ts.id = s.time_slot_id WHERE s.semester_id = 1 ORDER BY ts.day_of_week, ts.start_time",
  'schedules-count': "SELECT COUNT(*) AS c FROM schedules",
};
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query('SET search_path TO csms');
  for (const [name, q] of Object.entries(tests)) {
    try { const r = await c.query(q); console.log(name, 'OK rows:', r.rows.length, r.rows[0] ? JSON.stringify(r.rows[0]).slice(0, 160) : ''); }
    catch (e) { console.log(name, 'FAILED:', e.message); }
  }
  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
