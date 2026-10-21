import { describe, it, expect } from 'vitest';
import { formatBlockers } from '@/lib/modules/mod-02-master-list/references';

/**
 * The Master List used to answer every blocked delete with one generic
 * sentence: "That record is still referenced by other records". These tests
 * pin the specific, count-bearing message that replaced it.
 */
describe('MOD-02 blocked delete messages', () => {
  it('names the record and every referencing table with its count', () => {
    const msg = formatBlockers(
      'faculty',
      [
        { table: 'schedules', count: 5 },
        { table: 'faculty_subjects', count: 2 },
      ],
      'Maria Santos'
    );
    expect(msg).toBe(
      'Maria Santos is assigned to 5 schedules and 2 subjects. Remove or reassign them first.'
    );
    expect(msg).toContain('Maria Santos');
    expect(msg).toContain('5 schedules');
    expect(msg).toContain('2 subjects');
  });

  it('uses singular wording for a count of one', () => {
    // One reference type keeps its own verb; several read as a plain list.
    expect(
      formatBlockers('sections', [{ table: 'students', count: 1 }], 'Section BSIT-2A')
    ).toBe('Section BSIT-2A is enrolled in 1 student. Remove or reassign them first.');
  });

  it('uses plural wording for a count above one', () => {
    expect(
      formatBlockers('rooms', [{ table: 'schedules', count: 6 }], 'Room IT-101')
    ).toBe('Room IT-101 is assigned to 6 schedules. Remove or reassign them first.');
  });

  it('describes a subject in terms of teaching assignments, not subjects', () => {
    const msg = formatBlockers(
      'subjects',
      [
        { table: 'faculty_subjects', count: 1 },
        { table: 'curriculum', count: 1 },
        { table: 'schedules', count: 4 },
      ],
      'IT 111 (Introduction to Computing)'
    );
    expect(msg).toContain('1 teaching assignment');
    expect(msg).toContain('1 curriculum entry');
    expect(msg).toContain('4 schedules');
    expect(msg).not.toContain('1 subject,');
  });

  it('lists several counts with a readable conjunction', () => {
    const msg = formatBlockers(
      'sections',
      [
        { table: 'students', count: 2 },
        { table: 'schedules', count: 4 },
      ],
      'Section BSIT-1A'
    );
    expect(msg).toBe(
      'Section BSIT-1A is assigned to 2 students and 4 schedules. Remove or reassign them first.'
    );
  });

  it('returns null when nothing blocks the delete', () => {
    expect(formatBlockers('faculty', [], 'Maria Santos')).toBeNull();
  });

  it('always tells the user what to do next', () => {
    const msg = formatBlockers('users', [{ table: 'audit_logs', count: 3 }], 'Account fac-001');
    expect(msg).toContain('Remove or reassign them first.');
  });
});
