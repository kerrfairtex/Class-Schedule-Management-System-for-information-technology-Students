import Link from 'next/link';
import { ORGANIZATION } from '@/lib/domain/constants';

export const metadata = { title: 'Forgot password — TRAC BSIT CSMS' };

/**
 * There is no self-service reset (no email delivery is configured), so a
 * forgotten password is reset by a CSMS administrator, who issues a
 * temporary password that must be changed at the next sign-in.
 */
export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-midnight px-6 text-slate-100">
      <div className="max-w-md">
        <h1 className="text-3xl font-bold">Forgot your password?</h1>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-slate-300">
          <li>
            Ask a CSMS administrator in the {ORGANIZATION.departmentCode} department office to reset it. Bring
            your employee ID.
          </li>
          <li>You will get a temporary password.</li>
          <li>Sign in with it. You will be asked to choose a new password right away.</li>
        </ol>
        <p className="mt-4 text-sm text-slate-400">
          Students do not have accounts. Class schedules and room availability are public.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-lg bg-cyber-teal px-4 py-2 font-medium text-midnight hover:bg-cyber-cyan">
            Back to sign in
          </Link>
          <Link href="/schedules" className="rounded-lg border border-slate-600 px-4 py-2 hover:border-cyber-teal">
            Class schedules
          </Link>
          <Link href="/contact" className="rounded-lg border border-slate-600 px-4 py-2 hover:border-cyber-teal">
            Contact
          </Link>
        </div>
      </div>
    </main>
  );
}
