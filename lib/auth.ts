import { redirect } from 'next/navigation';
import { getSession } from '@/lib/modules/mod-01-auth/session';

export { setSession, getSession, clearSession, requireSession, changePassword } from '@/lib/modules/mod-01-auth/session';

/**
 * Server pages under /admin call this first. The proxy only checks that a
 * session cookie exists, so without it any logged-in student or faculty
 * member could open an admin page that reads the database directly.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');
  return session;
}
