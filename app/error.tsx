'use client'; // Error boundaries must be Client Components

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // The digest matches the server log entry; never show the raw message.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-midnight px-6 text-slate-100">
      <div role="alert" className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-300">Error</p>
        <h1 className="mt-2 text-3xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-slate-400">
          The page could not be loaded. Please try again. If it keeps happening, contact the BSIT department.
        </p>
        {error.digest && <p className="mt-2 font-mono text-xs text-slate-500">Reference: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-lg bg-cyber-teal px-4 py-2 font-medium text-midnight hover:bg-cyber-cyan"
          >
            Try again
          </button>
          <Link href="/" className="rounded-lg border border-slate-600 px-4 py-2 hover:border-cyber-teal">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
