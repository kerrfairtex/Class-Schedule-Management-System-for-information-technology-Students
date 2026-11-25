/**
 * Portal menus, defined once so every admin and faculty page shows the same
 * complete set of links. `moduleId` picks the icon in PortalLayout.
 */
export interface NavItem {
  href: string;
  label: string;
  moduleId?: string;
}

export const ADMIN_NAV: readonly NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', moduleId: 'admin-control' },
  { href: '/admin/schedule-board', label: 'Schedule Board', moduleId: 'schedule-board' },
  { href: '/admin/schedules', label: 'Schedule Status', moduleId: 'schedule' },
  { href: '/admin/conflicts', label: 'Conflicts', moduleId: 'audit' },
  { href: '/admin/terms', label: 'Terms & Periods', moduleId: 'terms' },
  { href: '/admin/bookings', label: 'Room Bookings', moduleId: 'bookings' },
  { href: '/admin/announcements', label: 'Announcements', moduleId: 'announcements' },
  { href: '/admin/master-list', label: 'Master List', moduleId: 'master-list' },
  { href: '/admin/faculty-availability', label: 'Faculty Availability', moduleId: 'faculty-availability' },
  { href: '/admin/audit', label: 'Audit Log', moduleId: 'audit-log' },
  { href: '/admin/settings', label: 'Settings', moduleId: 'database' },
  { href: '/admin/evidence', label: 'Evidence', moduleId: 'evidence' },
  { href: '/change-password', label: 'Change Password' },
];

export const FACULTY_NAV: readonly NavItem[] = [
  { href: '/faculty/dashboard', label: 'Dashboard', moduleId: 'dashboard' },
  { href: '/faculty/schedule', label: 'My Schedule', moduleId: 'schedule' },
  { href: '/faculty/availability', label: 'My Availability', moduleId: 'faculty-availability' },
  { href: '/schedules', label: 'Public Class Schedules', moduleId: 'student-schedule' },
  { href: '/change-password', label: 'Change Password' },
];

/** The menu with `active` set on the current page. */
export const navFor = (nav: readonly NavItem[], current: string) =>
  nav.map((item) => ({ ...item, active: item.href === current }));
