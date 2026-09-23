import Link from 'next/link';
import { SYSTEM_IDENTITY, ORGANIZATION } from '@/lib/domain/constants';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Guidelines — TRAC BSIT CSMS',
  description:
    'Usage guidelines and role-based access instructions for the TRAC BSIT Class Schedule Management System.',
};

export default function UserGuidelinesPage() {
  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-4">
          <Link href="/" className="text-sm text-cyber-teal hover:text-cyber-cyan">
            ← Back to home
          </Link>
        </div>

        <header className="mb-8 border-b border-slate-800 pb-6">
          <p className="text-xs uppercase tracking-wide text-cyber-teal">
            {SYSTEM_IDENTITY.short}
          </p>
          <h1 className="mt-2 text-3xl font-bold">{SYSTEM_IDENTITY.product}</h1>
          <p className="mt-1 text-slate-400">
            {SYSTEM_IDENTITY.institution} · {SYSTEM_IDENTITY.program}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold uppercase tracking-wide text-slate-200">
            Access Guidelines
          </h2>
          <p className="mb-4 text-slate-300">
            The Class Schedule Management System (CSMS) provides role-based access
            for the TRAC BSIT Department. Use the links below to enter the
            appropriate portal.
          </p>
          <ul className="list-disc space-y-2 pl-6 text-slate-300">
            <li>
              <span className="font-medium text-slate-200">Administrators:</span>{' '}
              Full system access. Use the{' '}
              <Link href="/login" className="text-cyber-teal hover:text-cyber-cyan">
                Admin Login
              </Link>{' '}
              to manage schedules, faculty load, master lists, and conflict resolution.
            </li>
            <li>
              <span className="font-medium text-slate-200">Faculty:</span>{' '}
              View assigned teaching loads, schedule boards, and faculty availability. Log in at{' '}
              <Link href="/login" className="text-cyber-teal hover:text-cyber-cyan">
                Faculty Login
              </Link>
              .
            </li>
            <li>
              <span className="font-medium text-slate-200">Students:</span>{' '}
              View your personal class schedule and academic calendar. Log in at{' '}
              <Link href="/login" className="text-cyber-teal hover:text-cyber-cyan">
                Student Login
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold uppercase tracking-wide text-slate-200">
            Browser & Device Requirements
          </h2>
          <p className="mb-2 text-slate-300">
            The system is optimized for desktop browsers. For the best experience,
            use the latest version of Chromium, Firefox, or Edge.
          </p>
          <ul className="list-disc space-y-1 pl-6 text-slate-300">
            <li>JavaScript must be enabled to use the interactive dashboard.</li>
            <li>Cookies must be enabled for authentication and session persistence.</li>
            <li>
              Mobile access is limited to read-only schedule viewing. Full
              administrative functions require a desktop browser.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold uppercase tracking-wide text-slate-200">
            Data Integrity & Conflict Resolution
          </h2>
          <p className="mb-2 text-slate-300">
            When a schedule conflict is detected (e.g., overlapping room or faculty
            assignments), the system highlights it on the schedule board. To resolve:
          </p>
          <ol className="list-decimal space-y-1 pl-6 text-slate-300">
            <li>Review the flagged conflict in the Admin Dashboard.</li>
            <li>Identify the affected faculty, room, or course.</li>
            <li>Adjust the schedule manually or request a re-run of the conflict engine.</li>
            <li>Confirm the resolution and re-validate the schedule board.</li>
          </ol>
        </section>

        <section className="mb-10 border-t border-slate-800 pt-6">
          <h2 className="mb-3 text-xl font-semibold uppercase tracking-wide text-slate-200">
            System Status
          </h2>
          <p className="text-sm text-slate-400">
            {ORGANIZATION.systemStatus === 'DEVELOPMENT'
              ? 'This platform is in active development and is not yet formally adopted as an official institutional platform. Report issues to the system developers or an authorized administrator.'
              : 'This platform is a live institutional system. Contact institutional support for assistance.'}
          </p>
        </section>

        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} {SYSTEM_IDENTITY.institution}. System
            developed for the BSIT academic scheduling context.
          </p>
        </div>
      </div>
    </div>
  );
}
