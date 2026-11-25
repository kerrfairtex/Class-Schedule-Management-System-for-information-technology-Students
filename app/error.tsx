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
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
      <div role="alert" className="max-w-md text-center">
        <p className="text-sm font-semibold text-coral">Error</p>
        <h1 className="mt-2 text-3xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-muted">
          The page could not be loaded. Please try again. If it keeps happening, contact the BSIT department.
        </p>
        {error.digest && <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-lg bg-lagoon px-4 py-2 font-medium text-white hover:bg-lagoon-dark"
          >
            Try again
          </button>
          <Link href="/" className="rounded-lg border border-line px-4 py-2 hover:border-lagoon">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
