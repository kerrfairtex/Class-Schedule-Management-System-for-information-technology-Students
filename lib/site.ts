/**
 * Canonical public origin, used for the sitemap, robots.txt and Open Graph
 * URLs. Set SITE_URL when the app moves to its own domain.
 */
export const SITE_URL = (
  process.env.SITE_URL || 'https://class-schedule-management-system-for-1myk.onrender.com'
).replace(/\/+$/, '');

/** Public, indexable pages. Portals, auth and APIs are deliberately absent. */
export const PUBLIC_PATHS = [
  '/',
  '/schedules',
  '/schedules/archive',
  '/today',
  '/announcements',
  '/sections',
  '/programs',
  '/courses',
  '/departments',
  '/faculty',
  '/rooms',
  '/academic-calendar',
  '/about',
  '/about/evidence',
  '/contact',
  '/developers',
  '/user-guide',
  '/user-guidelines',
] as const;
