/**
 * Explain why a record cannot be deleted.
 *
 * Every Master List table is referenced by other tables through foreign
 * keys with ON DELETE NO ACTION, so a referenced row must not be removed.
 * The old behaviour surfaced PostgreSQL's raw FK violation, which the API
 * mapped to one generic sentence: "That record is still referenced by
 * other records". That tells the user nothing about what to fix.
 *
 * This module reads the actual foreign key constraints from the database
 * (information_schema.referential_constraints) so the list of referencing
 * tables can never drift from the schema, then counts the rows that block
 * the delete and turns them into a message the user can act on:
 *
 *   "Maria Santos is assigned to 5 schedules and 2 subjects.
 *    Remove or reassign them first."
 *
 * The delete rules are unchanged - this only describes them.
 */

import { getDb } from '@/lib/persistence/db';
import { DomainError } from '@/lib/modules/mod-02-master-list/validation';

/** A table that references the record being deleted. */
export interface ReferenceSite {
  /** The child table, e.g. 'schedules'. */
  table: string;
  /** The foreign key column, e.g. 'faculty_id'. */
  column: string;
  /** The delete rule declared on the constraint. */
  deleteRule: string;
  /** How many rows currently point at the record. */
  count: number;
}

/** The entity types the Master List can delete. */
export type ReferencedEntity =
  | 'faculty'
  | 'students'
  | 'subjects'
  | 'sections'
  | 'rooms'
  | 'users';

/**
 * How to describe each referencing table in a sentence.
 *
 * `label` is what the user sees ("schedules"), `verb` completes
 * "is assigned to N <label>".
 */
const SITE_LABELS: Record<string, { label: string; plural: string; verb: string }> = {
  schedules: { label: 'schedule', plural: 'schedules', verb: 'assigned to' },
  // "teaching 2 subjects" reads correctly for a faculty member but not for
  // a subject, so the wording depends on the entity being deleted.
  faculty_subjects: { label: 'subject', plural: 'subjects', verb: 'teaching' },
  faculty_availability: { label: 'availability slot', plural: 'availability slots', verb: 'marked available in' },
  curriculum: { label: 'curriculum entry', plural: 'curriculum entries', verb: 'listed in' },
  students: { label: 'student', plural: 'students', verb: 'enrolled in' },
  users: { label: 'login account', plural: 'login accounts', verb: 'used by' },
  audit_logs: { label: 'audit log entry', plural: 'audit log entries', verb: 'recorded in' },
};

/**
 * Per-entity wording overrides.
 *
 * The same child table means different things depending on what is being
 * deleted: faculty_subjects holds "2 subjects" for a faculty member but
 * "2 teaching assignments" for a subject.
 */
const ENTITY_OVERRIDES: Partial<
  Record<ReferencedEntity, Record<string, { label: string; plural: string; verb: string }>>
> = {
  subjects: {
    faculty_subjects: {
      label: 'teaching assignment',
      plural: 'teaching assignments',
      verb: 'assigned to',
    },
    curriculum: {
      label: 'curriculum entry',
      plural: 'curriculum entries',
      verb: 'listed in',
    },
  },
};

/**
 * Child tables each delete routine removes as part of the delete itself.
 *
 * The delete routines delete these rows FIRST, because the foreign keys use
 * ON DELETE NO ACTION and would otherwise raise a violation. They are
 * therefore not blockers and must not be reported as such - the login
 * account created alongside a faculty member or student is deleted with it.
 *
 * This is per parent table on purpose: faculty_subjects is removed when a
 * FACULTY is deleted, but a faculty_subjects row still blocks the delete
 * of a SUBJECT it points at.
 */
const MANAGED_CHILDREN: Record<ReferencedEntity, Set<string>> = {
  faculty: new Set(['users', 'faculty_subjects', 'faculty_availability']),
  students: new Set(['users']),
  subjects: new Set(),
  sections: new Set(),
  rooms: new Set(),
  users: new Set(),
};

/**
 * Read the foreign keys that reference a table, from the live schema.
 *
 * The result is cached per table because the schema does not change while
 * the process runs.
 */
const fkCache = new Map<string, { table: string; column: string; deleteRule: string }[]>();

async function referencingColumns(
  parentTable: string
): Promise<{ table: string; column: string; deleteRule: string }[]> {
  const cached = fkCache.get(parentTable);
  if (cached) return cached;

  const db = await getDb();
  const rows = (await db
    .prepare(
      `SELECT tc.table_name    AS child_table,
              kcu.column_name   AS child_column,
              rc.delete_rule    AS delete_rule
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
         JOIN information_schema.referential_constraints rc
           ON rc.constraint_name = tc.constraint_name
          AND rc.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'csms'
          AND ccu.table_name = $1`
    )
    .all(parentTable)) as { child_table: string; child_column: string; delete_rule: string }[];

  const result = rows.map((r) => ({
    table: r.child_table,
    column: r.child_column,
    deleteRule: r.delete_rule,
  }));
  fkCache.set(parentTable, result);
  return result;
}

/**
 * Count the rows in every table that references the given record.
 *
 * Only constraints with ON DELETE NO ACTION (or RESTRICT) actually block a
 * delete. A CASCADE rule would remove the child rows automatically, so it
 * is not reported as a blocker.
 */
export async function countReferences(
  entity: ReferencedEntity,
  id: number
): Promise<ReferenceSite[]> {
  const db = await getDb();
  const fks = await referencingColumns(entity);
  const sites: ReferenceSite[] = [];

  const managed = MANAGED_CHILDREN[entity] ?? new Set<string>();
  for (const fk of fks) {
    if (fk.deleteRule === 'CASCADE') continue;
    // Rows the delete removes itself are not blockers.
    if (managed.has(fk.table)) continue;
    const row = (await db
      .prepare(`SELECT COUNT(*) as c FROM csms.${quoteIdent(fk.table)} WHERE ${quoteIdent(fk.column)} = ?`)
      .get(id)) as { c: number } | undefined;
    const count = Number(row?.c ?? 0);
    if (count > 0) {
      sites.push({ table: fk.table, column: fk.column, deleteRule: fk.deleteRule, count });
    }
  }
  return sites;
}

/** Quote a SQL identifier so an odd table or column name cannot break the query. */
function quoteIdent(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

/**
 * Build the "why you cannot delete this" message from the reference counts.
 *
 * Exported so it can be unit tested without a database.
 */
export function formatBlockers(
  entity: ReferencedEntity,
  sites: { table: string; count: number }[],
  displayName: string
): string | null {
  if (sites.length === 0) return null;

  const overrides = ENTITY_OVERRIDES[entity] ?? {};
  const metaFor = (table: string) =>
    overrides[table] ?? SITE_LABELS[table] ?? { label: table, plural: table, verb: 'referenced in' };

  const parts = sites.map((s) => {
    const meta = metaFor(s.table);
    return `${s.count} ${s.count === 1 ? meta.label : meta.plural}`;
  });

  const noun = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  // One reference type reads best with its own verb ("is teaching 2 subjects");
  // several read best as a plain list ("is assigned to 5 schedules and 2 subjects").
  const verb = parts.length === 1 ? metaFor(sites[0].table).verb : 'assigned to';

  return `${displayName} is ${verb} ${noun}. Remove or reassign them first.`;
}

/**
 * Build the "why you cannot delete this" message.
 *
 * Returns null when nothing blocks the delete.
 */
export async function describeBlockers(
  entity: ReferencedEntity,
  id: number,
  displayName: string
): Promise<string | null> {
  const sites = await countReferences(entity, id);
  return formatBlockers(entity, sites, displayName);
}
