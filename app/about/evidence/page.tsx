import type { Metadata } from 'next';
import Link from 'next/link';
import {
  EVIDENCE_SOURCES,
  INSTITUTIONAL_FACTS,
  PENDING_VERIFICATION_ITEMS,
  countByStatus,
  countSourcesByAuthority,
  getSource,
  type EvidenceStatus,
} from '@/lib/evidence/institutional-facts';

export const metadata: Metadata = {
  title: 'Source of Truth — TRAC BSIT CSMS',
  description:
    'Verified institutional facts and source registry for the TRAC BSIT Class Schedule Management System.',
};

const STATUS_STYLES: Record<EvidenceStatus, { label: string; className: string }> = {
  VERIFIED: {
    label: 'VERIFIED',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  OFFICIAL: {
    label: 'OFFICIAL',
    className: 'border-cyber-teal/40 bg-cyber-teal/10 text-cyber-teal',
  },
  GOVERNMENT_SUPPORTED: {
    label: 'GOVERNMENT SOURCE',
    className: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  },
  CORROBORATED: {
    label: 'CORROBORATED',
    className: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  },
  PENDING_VERIFICATION: {
    label: 'PENDING VERIFICATION',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  UNVERIFIED: {
    label: 'UNVERIFIED',
    className: 'border-red-500/40 bg-red-500/10 text-red-300',
  },
  CONFLICTING: {
    label: 'CONFLICTING',
    className: 'border-red-600/40 bg-red-600/10 text-red-400',
  },
  DEPRECATED: {
    label: 'DEPRECATED',
    className: 'border-slate-500/40 bg-slate-500/10 text-slate-400',
  },
};

const AUTHORITY_LEVELS: Record<number, string> = {
  1: 'Primary Legal Authority',
  2: 'Official TRAC Source',
  3: 'CHED / Government Source',
  4: 'Official Academic Record',
  5: 'Secondary Source',
  6: 'Social Media / Community Source',
};

export default function EvidencePage() {
  const factCounts = countByStatus();
  const sourceCounts = countSourcesByAuthority();
  const totalFacts = INSTITUTIONAL_FACTS.length;
  const verifiedCount =
    factCounts.VERIFIED +
    factCounts.OFFICIAL +
    factCounts.GOVERNMENT_SUPPORTED +
    factCounts.CORROBORATED;
  const pendingCount = factCounts.PENDING_VERIFICATION;
  const conflictingCount = factCounts.CONFLICTING;
  const totalSources = EVIDENCE_SOURCES.length;

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-4">
          <Link
            href="/"
            className="text-sm text-cyber-teal hover:text-cyber-cyan transition-colors"
          >
            ← Back to home
          </Link>
        </div>

        <header className="mb-12 border-b border-slate-800 pb-8">
          <h1 className="mb-4 text-4xl font-bold">Source of Truth</h1>
          <p className="text-lg text-slate-400">
            Every institutional claim displayed by the TRAC BSIT CSMS is
            classified and traceable to an identified source. This page is the
            authoritative reference for what the system asserts as institutional
            fact, and what remains pending verification.
          </p>
        </header>

        {/* Dashboard summary — per spec §66 */}
        <section className="mb-12">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="glass-card p-5">
              <p className="text-xs uppercase tracking-wide text-cyber-teal">
                Institutional Facts
              </p>
              <p className="mt-2 text-3xl font-bold">{totalFacts}</p>
              <p className="mt-1 text-xs text-slate-400">total tracked</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs uppercase tracking-wide text-emerald-400">
                Verified / Official
              </p>
              <p className="mt-2 text-3xl font-bold">{verifiedCount}</p>
              <p className="mt-1 text-xs text-slate-400">
                {pendingCount} pending, {conflictingCount} conflicting
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs uppercase tracking-wide text-violet-400">
                Sources
              </p>
              <p className="mt-2 text-3xl font-bold">{totalSources}</p>
              <p className="mt-1 text-xs text-slate-400">
                Level 1: {sourceCounts[1]} · Level 2: {sourceCounts[2]}
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs uppercase tracking-wide text-amber-400">
                Last Verification
              </p>
              <p className="mt-2 text-3xl font-bold">2026-08-31</p>
              <p className="mt-1 text-xs text-slate-400">Verification baseline</p>
            </div>
          </div>
        </section>

        {/* Institutional Facts — per spec §67 */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">Institutional Facts</h2>
          <div className="space-y-4">
            {INSTITUTIONAL_FACTS.map((fact) => {
              const source = getSource(fact.sourceId);
              const statusStyle = STATUS_STYLES[fact.status];
              return (
                <article
                  key={fact.id}
                  className="glass-card p-5"
                  data-aos="fade-up"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <code className="text-xs text-slate-500">{fact.id}</code>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${statusStyle.className}`}
                    >
                      {statusStyle.label}
                    </span>
                    <span className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
                      {fact.category}
                    </span>
                    <span className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
                      Confidence: {fact.confidence}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-100">
                    {fact.key.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-sm text-slate-300">{fact.value}</p>
                  {fact.notes && (
                    <p className="mt-3 text-xs italic text-slate-500">
                      Note: {fact.notes}
                    </p>
                  )}
                  <div className="mt-4 grid gap-2 border-t border-slate-800 pt-3 text-xs text-slate-500 sm:grid-cols-3">
                    <div>
                      <span className="block uppercase tracking-wide">Source</span>
                      <span className="text-slate-300">
                        {source?.id ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className="block uppercase tracking-wide">
                        Verified
                      </span>
                      <span className="text-slate-300">{fact.verifiedAt}</span>
                    </div>
                    <div>
                      <span className="block uppercase tracking-wide">
                        Review due
                      </span>
                      <span className="text-slate-300">
                        {fact.reviewDueAt ?? '—'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Pending verification items — per spec §62 */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">
            Pending Verification Items
          </h2>
          <div className="glass-card p-5">
            <p className="mb-4 text-sm text-slate-400">
              These institutional data points MUST NOT be displayed as
              authoritative facts until an authoritative TRAC source is
              identified. Per spec §62.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {PENDING_VERIFICATION_ITEMS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Source registry — per spec §75 */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">Source Registry</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-3 pr-4">ID</th>
                  <th className="py-3 pr-4">Title</th>
                  <th className="py-3 pr-4">Authority</th>
                  <th className="py-3 pr-4">Accessed</th>
                  <th className="py-3 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {EVIDENCE_SOURCES.map((source) => (
                  <tr
                    key={source.id}
                    className="border-b border-slate-800 last:border-b-0"
                  >
                    <td className="py-3 pr-4">
                      <code className="text-cyber-teal">{source.id}</code>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-slate-100">{source.title}</p>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyber-teal hover:underline"
                        >
                          {source.url}
                        </a>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      Level {source.authorityLevel}
                      <br />
                      <span className="text-xs text-slate-500">
                        {AUTHORITY_LEVELS[source.authorityLevel]}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">
                      {source.accessedAt}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          source.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {source.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Definitions — per spec §68, §69 */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">Definitions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass-card p-5">
              <h3 className="mb-2 text-lg font-semibold text-cyber-teal">
                Grounded
              </h3>
              <p className="text-sm text-slate-300">
                A claim is grounded when the system can identify the source
                from which the claim was obtained and can determine the
                source&apos;s authority, temporal validity, and verification status.
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Grounded ≠ copied from Google<br />
                Grounded ≠ found on Facebook<br />
                Grounded ≠ generated by AI<br />
                <strong>Grounded = traceable evidence</strong>
              </p>
            </div>
            <div className="glass-card p-5">
              <h3 className="mb-2 text-lg font-semibold text-cyber-teal">
                Source of Truth
              </h3>
              <p className="text-sm text-slate-300">
                <strong>Institutional:</strong> the authoritative source or
                verified evidence record from which the CSMS derives an
                institutional fact.
              </p>
              <p className="mt-3 text-sm text-slate-300">
                <strong>Operational:</strong> the authoritative database record
                representing the currently approved state of the scheduling
                operation.
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          <p>
            Verification baseline: 2026-08-31 · TRAC BSIT Class Schedule
            Management System
          </p>
        </footer>
      </div>
    </div>
  );
}