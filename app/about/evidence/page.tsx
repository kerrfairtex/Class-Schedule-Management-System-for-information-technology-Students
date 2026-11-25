import type { Metadata } from 'next';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
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
    className: 'border-seagrass/40 bg-seagrass-50 text-seagrass',
  },
  OFFICIAL: {
    label: 'OFFICIAL',
    className: 'border-lagoon/40 bg-lagoon-50 text-lagoon',
  },
  GOVERNMENT_SUPPORTED: {
    label: 'GOVERNMENT SOURCE',
    className: 'border-lagoon/40 bg-lagoon-50 text-lagoon-dark',
  },
  CORROBORATED: {
    label: 'CORROBORATED',
    className: 'border-violet-500/40 bg-paper-2 text-ink-soft',
  },
  PENDING_VERIFICATION: {
    label: 'PENDING VERIFICATION',
    className: 'border-sand-dark/50 bg-sand text-ink',
  },
  UNVERIFIED: {
    label: 'UNVERIFIED',
    className: 'border-coral/40 bg-coral-50 text-coral',
  },
  CONFLICTING: {
    label: 'CONFLICTING',
    className: 'border-coral/40 bg-red-600/10 text-coral',
  },
  DEPRECATED: {
    label: 'DEPRECATED',
    className: 'border-line-strong bg-paper-2 text-muted',
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
    <div className="min-h-screen">
      <PublicHeader />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-4">
        </div>

        <header className="mb-12 border-b border-line pb-8">
          <h1 className="mb-4 text-4xl font-bold">Source of Truth</h1>
          <p className="text-lg text-muted">
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
              <p className="text-xs text-lagoon">
                Institutional Facts
              </p>
              <p className="mt-2 text-3xl font-bold">{totalFacts}</p>
              <p className="mt-1 text-xs text-muted">total tracked</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-seagrass">
                Verified / Official
              </p>
              <p className="mt-2 text-3xl font-bold">{verifiedCount}</p>
              <p className="mt-1 text-xs text-muted">
                {pendingCount} pending, {conflictingCount} conflicting
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-ink-soft">
                Sources
              </p>
              <p className="mt-2 text-3xl font-bold">{totalSources}</p>
              <p className="mt-1 text-xs text-muted">
                Level 1: {sourceCounts[1]} · Level 2: {sourceCounts[2]}
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-ink">
                Last Verification
              </p>
              <p className="mt-2 text-3xl font-bold">2026-08-31</p>
              <p className="mt-1 text-xs text-muted">Verification baseline</p>
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
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <code className="text-xs text-muted">{fact.id}</code>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium   ${statusStyle.className}`}
                    >
                      {statusStyle.label}
                    </span>
                    <span className="rounded border border-line px-2 py-0.5 text-xs text-muted">
                      {fact.category}
                    </span>
                    <span className="rounded border border-line px-2 py-0.5 text-xs text-muted">
                      Confidence: {fact.confidence}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-ink">
                    {fact.key.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-sm text-ink-soft">{fact.value}</p>
                  {fact.notes && (
                    <p className="mt-3 text-xs italic text-muted">
                      Note: {fact.notes}
                    </p>
                  )}
                  <div className="mt-4 grid gap-2 border-t border-line pt-3 text-xs text-muted sm:grid-cols-3">
                    <div>
                      <span className="block">Source</span>
                      <span className="text-ink-soft">
                        {source?.id ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className="block">
                        Verified
                      </span>
                      <span className="text-ink-soft">{fact.verifiedAt}</span>
                    </div>
                    <div>
                      <span className="block">
                        Review due
                      </span>
                      <span className="text-ink-soft">
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
            <p className="mb-4 text-sm text-muted">
              These institutional data points MUST NOT be displayed as
              authoritative facts until an authoritative TRAC source is
              identified. Per spec §62.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {PENDING_VERIFICATION_ITEMS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-ink-soft"
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
            <table className="data-table">
              <thead>
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
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="py-3 pr-4">
                      <code className="text-lagoon">{source.id}</code>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-ink">{source.title}</p>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-lagoon hover:underline"
                        >
                          {source.url}
                        </a>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">
                      Level {source.authorityLevel}
                      <br />
                      <span className="text-xs text-muted">
                        {AUTHORITY_LEVELS[source.authorityLevel]}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {source.accessedAt}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          source.status === 'ACTIVE'
                            ? 'bg-seagrass-50 text-seagrass'
                            : 'bg-paper-2 text-muted'
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
              <h3 className="mb-2 text-lg font-semibold text-lagoon">
                Grounded
              </h3>
              <p className="text-sm text-ink-soft">
                A claim is grounded when the system can identify the source
                from which the claim was obtained and can determine the
                source&apos;s authority, temporal validity, and verification status.
              </p>
              <p className="mt-3 text-xs text-muted">
                Grounded ≠ copied from Google<br />
                Grounded ≠ found on Facebook<br />
                Grounded ≠ generated by AI<br />
                <strong>Grounded = traceable evidence</strong>
              </p>
            </div>
            <div className="glass-card p-5">
              <h3 className="mb-2 text-lg font-semibold text-lagoon">
                Source of Truth
              </h3>
              <p className="text-sm text-ink-soft">
                <strong>Institutional:</strong> the authoritative source or
                verified evidence record from which the CSMS derives an
                institutional fact.
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                <strong>Operational:</strong> the authoritative database record
                representing the currently approved state of the scheduling
                operation.
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-line pt-6 text-center text-xs text-muted">
          <p>
            Verification baseline: 2026-08-31 · TRAC BSIT Class Schedule
            Management System
          </p>
        </footer>
      </div>
      <PublicFooter />
    </div>
  );
}