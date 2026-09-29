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
    <div className="min-h-screen bg-midnight text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Change Password</h1>
          <p className="text-slate-400 mt-2">
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
