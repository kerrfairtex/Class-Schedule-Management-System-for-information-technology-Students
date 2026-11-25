import { redirect } from 'next/navigation';
import { getSession } from '@/lib/modules/mod-01-auth/session';
import { ChangePasswordForm } from './ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Change password</h1>
          <p className="text-muted mt-2">
            {session.mustChangePassword
              ? 'You must change your password before continuing'
              : 'Enter your current password and choose a new one'}
          </p>
        </div>
        <ChangePasswordForm mustChange={session.mustChangePassword ?? false} />
      </div>
    </div>
  );
}
