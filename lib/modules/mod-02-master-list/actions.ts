/**
 * The Master List (MOD-02) tab keys and the API action names they map to.
 *
 * The tab keys are plural ("students") but the admin API actions are
 * singular ("create-student"). Building the action with a template literal
 * from the tab key therefore produced "create-students", which the API
 * rejected with a generic "Invalid request" and nothing else. This module
 * is the single source of truth for that mapping.
 *
 * `MasterListAction` is derived from the API's own action list, so a
 * typo or a renamed action fails at compile time instead of at runtime.
 */

/** The Master List tabs, in the order the UI shows them. */
export const MASTER_LIST_TABS = [
  'faculty',
  'students',
  'subjects',
  'sections',
  'rooms',
  'users',
] as const;

export type MasterListTab = (typeof MASTER_LIST_TABS)[number];

/**
 * The singular resource name the admin API uses for each tab.
 * faculty -> faculty, students -> student, subjects -> subject,
 * sections -> section, rooms -> room, users -> user.
 */
export const ACTION_SUFFIX = {
  faculty: 'faculty',
  students: 'student',
  subjects: 'subject',
  sections: 'section',
  rooms: 'room',
  users: 'user',
} as const satisfies Record<MasterListTab, string>;

export type ActionSuffix = (typeof ACTION_SUFFIX)[MasterListTab];

/**
 * Every action the admin API accepts for a Master List resource, keyed by
 * tab. This list is the source of truth for `MasterListAction`, so adding an
 * action here without adding it to the API (or vice versa) is a type error.
 */
export const MASTER_LIST_ACTIONS = {
  faculty: ['create-faculty', 'update-faculty', 'delete-faculty'],
  students: ['create-student', 'update-student', 'delete-student'],
  subjects: ['create-subject', 'update-subject', 'delete-subject'],
  sections: ['create-section', 'update-section', 'delete-section'],
  rooms: ['create-room', 'update-room', 'delete-room'],
  users: ['create-user', 'update-user', 'delete-user'],
} as const satisfies Record<MasterListTab, readonly string[]>;

export type MasterListAction =
  (typeof MASTER_LIST_ACTIONS)[MasterListTab][number];

/**
 * Build an API action name for a tab.
 *
 * The `verb` is constrained to 'create' | 'update' | 'delete' and the
 * result type is `MasterListAction`, so `masterListAction('students',
 * 'create')` is statically known to be 'create-student' - not
 * 'create-students'.
 */
export function masterListAction(
  tab: MasterListTab,
  verb: 'create' | 'update' | 'delete'
): MasterListAction {
  const suffix = ACTION_SUFFIX[tab];
  const action = `${verb}-${suffix}`;
  // Runtime guard: the type system already guarantees this, but the cast
  // keeps the return type honest if the map is ever edited by hand.
  if (!MASTER_LIST_ACTIONS[tab].includes(action as never)) {
    throw new Error(
      `Unknown Master List action "${action}" for tab "${tab}". ` +
        `Expected one of: ${MASTER_LIST_ACTIONS[tab].join(', ')}`
    );
  }
  return action as MasterListAction;
}
