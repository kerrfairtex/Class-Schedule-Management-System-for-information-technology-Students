import Link from 'next/link';

export const metadata = { title: 'Page not found — TRAC BSIT CSMS' };

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-midnight px-6 text-slate-100">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyber-teal">404</p>
        <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-slate-400">
          The page you are looking for does not exist or has moved. Published class schedules are on the
          Schedules page.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-lg bg-cyber-teal px-4 py-2 font-medium text-midnight hover:bg-cyber-cyan">
            Go home
          </Link>
          <Link href="/schedules" className="rounded-lg border border-slate-600 px-4 py-2 hover:border-cyber-teal">
            View schedules
          </Link>
        </div>
      </div>
    </main>
  );
}
