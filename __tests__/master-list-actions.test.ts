import { describe, it, expect } from 'vitest';
import {
  masterListAction,
  ACTION_SUFFIX,
  MASTER_LIST_ACTIONS,
  MASTER_LIST_TABS,
  type MasterListTab,
} from '@/lib/modules/mod-02-master-list/actions';
import { AdminPostSchema } from '@/lib/api/admin/action-schema';

/**
 * Regression test for the "Invalid request" bug in Admin > Master List.
 *
 * The Master List form builds its API action from the tab key with a
 * template literal. The tab keys are plural ("students") but the admin API
 * actions are singular ("create-student"), so the form sent
 * "create-students" / "delete-students" and the API answered
 * 400 {"error":"Invalid request"} with an empty fields map - for every tab
 * except Faculty.
 *
 * These tests deliberately drive `masterListAction()`, the same function the
 * form and the page call, and assert the result against the API's own
 * action list. A hand-written action string in the test would not have
 * caught the mismatch.
 */
describe('MOD-02 Master List action names', () => {
  it('maps every tab to the singular action the API expects', () => {
    // The API's own list, copied from app/api/admin/route.ts.
    const apiActions = {
      faculty: ['create-faculty', 'update-faculty', 'delete-faculty'],
      students: ['create-student', 'update-student', 'delete-student'],
      subjects: ['create-subject', 'update-subject', 'delete-subject'],
      sections: ['create-section', 'update-section', 'delete-section'],
      rooms: ['create-room', 'update-room', 'delete-room'],
      users: ['create-user', 'update-user', 'delete-user'],
    } as const;

    for (const tab of MASTER_LIST_TABS) {
      expect(ACTION_SUFFIX[tab]).toBe(apiActions[tab][0].split('-')[1]);
      for (const verb of ['create', 'update', 'delete'] as const) {
        const action = masterListAction(tab, verb);
        expect(apiActions[tab] as readonly string[]).toContain(action);
        // The bug: `create-${tab}` produced 'create-students'. 'faculty' is
        // singular in both the tab key and the action, so it is the one tab
        // where the template literal happened to be correct.
        if (tab !== 'faculty') {
          expect(action).not.toBe(`${verb}-${tab}`);
        }
      }
    }
  });

  it('never produces a plural action for a plural tab key', () => {
    // The exact regression: every tab except faculty is plural.
    expect(masterListAction('students', 'create')).toBe('create-student');
    expect(masterListAction('students', 'update')).toBe('update-student');
    expect(masterListAction('students', 'delete')).toBe('delete-student');
    expect(masterListAction('subjects', 'create')).toBe('create-subject');
    expect(masterListAction('sections', 'create')).toBe('create-section');
    expect(masterListAction('rooms', 'create')).toBe('create-room');
    expect(masterListAction('users', 'create')).toBe('create-user');
    expect(masterListAction('faculty', 'create')).toBe('create-faculty');
  });

  it('produces an action the API schema accepts for every tab and verb', () => {
    for (const tab of MASTER_LIST_TABS) {
      for (const verb of ['create', 'update', 'delete'] as const) {
        const body = { action: masterListAction(tab, verb) };
        const parsed = AdminPostSchema.safeParse(body);
        expect(
          parsed.success,
          `action "${body.action}" was rejected by AdminPostSchema`
        ).toBe(true);
      }
    }
  });

  it('rejects the old plural action names', () => {
    // Guards against anyone reintroducing `create-${tab}`.
    for (const tab of MASTER_LIST_TABS) {
      const parsed = AdminPostSchema.safeParse({ action: `create-${tab}` });
      if (tab === 'faculty') {
        // 'faculty' is singular in both places, so it is legitimately valid.
        expect(parsed.success).toBe(true);
      } else {
        expect(parsed.success).toBe(false);
      }
    }
  });

  it('accepts a numeric password and coerces it to a string', () => {
    const parsed = AdminPostSchema.safeParse({
      action: 'create-student',
      password: 224567777,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as { password: string }).password).toBe('224567777');
    }
  });

  it('reports the failing field instead of a bare "Invalid request"', () => {
    const parsed = AdminPostSchema.safeParse({ action: 'not-a-real-action' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      // The route turns these issues into the `fields` map the UI renders.
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.length > 0 ? issue.path.join('.') : 'request';
        if (!fields[key]) fields[key] = issue.message;
      }
      expect(fields.action).toBeTruthy();
      expect(fields.action.length).toBeGreaterThan(0);
    }
  });
});
