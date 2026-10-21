import { getDb } from '../lib/persistence/db';
import { assertNotProductionDatabase } from '@/lib/guards/production-database';

// Refuse to write to the production database by accident.
assertNotProductionDatabase();
getDb();
console.log('CSMS database seeded (TRAC / BSIT)');
