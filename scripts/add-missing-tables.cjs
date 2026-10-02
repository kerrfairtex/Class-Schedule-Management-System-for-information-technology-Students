const { Client } = require('pg');
const sql = `
SET search_path TO csms;
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY, title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('LAW','OFFICIAL_WEBSITE','GOVERNMENT','ACADEMIC_RECORD','SECONDARY','SOCIAL')),
  authority_level INTEGER NOT NULL CHECK(authority_level BETWEEN 1 AND 6),
  publisher TEXT NOT NULL, url TEXT, document_date TEXT, effective_date TEXT,
  accessed_at TEXT NOT NULL, content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','DEPRECATED')),
  notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS institutional_facts (
  id TEXT PRIMARY KEY, institution_id TEXT NOT NULL DEFAULT 'TRAC',
  category TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string' CHECK(value_type IN ('string','date','enum','list','number')),
  status TEXT NOT NULL CHECK(status IN ('VERIFIED','OFFICIAL','GOVERNMENT_SUPPORTED','CORROBORATED','PENDING_VERIFICATION','UNVERIFIED','CONFLICTING','DEPRECATED')),
  confidence TEXT NOT NULL CHECK(confidence IN ('HIGH','MEDIUM','LOW','UNVERIFIED')),
  effective_from TEXT, effective_until TEXT, verified_at TEXT NOT NULL, verified_by TEXT,
  review_due_at TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_facts_status ON institutional_facts(status);
CREATE INDEX IF NOT EXISTS idx_facts_category ON institutional_facts(category);
CREATE INDEX IF NOT EXISTS idx_facts_review ON institutional_facts(review_due_at);
CREATE TABLE IF NOT EXISTS officials (
  id SERIAL PRIMARY KEY, position TEXT NOT NULL, first_name TEXT NOT NULL, middle_name TEXT,
  last_name TEXT NOT NULL, suffix TEXT, title TEXT, office TEXT, effective_from TEXT, effective_until TEXT,
  source_id TEXT REFERENCES sources(id),
  status TEXT NOT NULL DEFAULT 'CURRENT' CHECK(status IN ('CURRENT','FORMER','PENDING_VERIFICATION')),
  data_environment TEXT NOT NULL DEFAULT 'DEMO' CHECK(data_environment IN ('DEMO','VERIFIED','PRODUCTION')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS institution_contacts (
  id SERIAL PRIMARY KEY, office TEXT NOT NULL,
  contact_type TEXT NOT NULL CHECK(contact_type IN ('email','phone','mobile','fax','address')),
  value TEXT NOT NULL, label TEXT, is_primary INTEGER DEFAULT 0,
  source_id TEXT REFERENCES sources(id), verified_at TEXT,
  data_environment TEXT NOT NULL DEFAULT 'VERIFIED' CHECK(data_environment IN ('DEMO','VERIFIED','PRODUCTION')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_by TEXT);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS data_environment TEXT NOT NULL DEFAULT 'DEMO';
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS data_environment TEXT NOT NULL DEFAULT 'DEMO';
ALTER TABLE sections ADD COLUMN IF NOT EXISTS data_environment TEXT NOT NULL DEFAULT 'DEMO';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS data_environment TEXT NOT NULL DEFAULT 'DEMO';
INSERT INTO system_settings (key, value, description, updated_by)
  VALUES ('data_environment','DEMO','Development fixtures, never authoritative.','csms-developer-team')
  ON CONFLICT (key) DO NOTHING;
`;
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(sql);
  const r = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='csms' ORDER BY 1");
  console.log(r.rows.map(x => x.table_name).join(', '));
  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
