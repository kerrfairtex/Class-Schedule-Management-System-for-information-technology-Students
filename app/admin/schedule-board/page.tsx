'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PortalSidebar } from '@/components/Sidebar';
import { ScheduleBoard, STATUS_BADGE, useScheduleBoardData } from '@/components/ScheduleBoard';
import { ManualScheduleForm } from '@/components/ManualScheduleForm';
import { scheduleApi } from '@/lib/api/client';
import { ORGANIZATION } from '@/lib/domain/constants';
import { STATUS_LABEL } from '@/lib/domain/schedule-status';
import type { ScheduleStatus } from '@/lib/domain/types';
import { ADMIN_NAV, navFor } from '@/lib/domain/navigation';

/** One-click workflow steps applied to every matching class in the current view. */
const BULK_STEPS: { from: ScheduleStatus; to: ScheduleStatus; label: string }[] = [
  { from: 'DRAFT', to: 'PENDING_REVIEW', label: 'Submit drafts for review' },
  { from: 'PENDING_REVIEW', to: 'APPROVED', label: 'Approve pending' },
  { from: 'APPROVED', to: 'PUBLISHED', label: 'Publish approved' },
];

const SUMMARY_ORDER: ScheduleStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'CANCELLED'];

export default function ScheduleBoardPage() {
  const router = useRouter();
  const [sections, setSections] = useState<{ id: number; code: string }[]>([]);
  const [sectionFilter, setSectionFilter] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const { schedules, timeSlots, loading, loadError, refresh } = useScheduleBoardData(sectionFilter);

  useEffect(() => {
    fetch('/api/admin?resource=sections')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) router.push('/login');
        else setSections(d);
      })
      .catch(() => setError('Could not load sections'));
  }, [router]);

  const counts = schedules.reduce<Partial<Record<ScheduleStatus, number>>>((acc, s) => {
    const st = s.status ?? 'DRAFT';
    acc[st] = (acc[st] ?? 0) + 1;
    return acc;
  }, {});

  async function generateForSection(sectionId: number) {
    setMessage('');
    setError('');
    try {
      const data = await scheduleApi.generate(sectionId);
      setMessage(
        `Generated ${data.created} draft class(es).${data.errors?.length ? ' Not scheduled: ' + data.errors.join(', ') : ''}`
      );
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    }
  }

  async function runBulk(from: ScheduleStatus, to: ScheduleStatus) {
    const targets = schedules.filter((s) => (s.status ?? 'DRAFT') === from);
    if (targets.length === 0) return;
    if (
      to === 'PUBLISHED' &&
      !confirm(`Publish ${targets.length} class(es)? Students and the public site will see them.`)
    ) {
      return;
    }
    setBulkBusy(true);
    setMessage('');
    setError('');
    const failures: string[] = [];
    // Sequential: each publish re-checks conflicts against the rows before it.
    for (const s of targets) {
      try {
        await scheduleApi.transition(s.id, to);
      } catch (err) {
        failures.push(`${s.subject_code} ${s.section_code}: ${err instanceof Error ? err.message : 'failed'}`);
      }
    }
    const done = targets.length - failures.length;
    setMessage(`${done} of ${targets.length} class(es) moved to ${STATUS_LABEL[to]}.`);
    if (failures.length) setError(failures.join(' · '));
    setBulkBusy(false);
    refresh();
  }

  const adminLinks = navFor(ADMIN_NAV, '/admin/schedule-board');

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <PortalSidebar title="Admin" name="Administrator" subtitle={ORGANIZATION.departmentCode} links={adminLinks} />
      <main className="min-w-0 flex-1 p-4 sm:p-8">
        <h1 className="mb-2 text-2xl font-bold">Schedule Board</h1>
        <p className="mb-6 text-sm text-slate-500">
          MOD-03 Generation · MOD-04 Conflict Detection · MOD-05 Manual Adjustment
        </p>

        <div aria-live="polite">
          {message && (
            <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>
          )}
          {error && (
            <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <ManualScheduleForm
            onSuccess={(warnings) => {
              setMessage(
                warnings.length
                  ? `Draft class created, with a warning: ${warnings.join('; ')}`
                  : 'Draft class created. Submit it for review, approve and publish it to make it visible to students.'
              );
              setError('');
              refresh();
            }}
            onError={(msg) => {
              setMessage('');
              setError(msg);
            }}
          />
          <div className="flex items-center gap-2">
            <label htmlFor="section-filter" className="text-sm font-medium text-slate-600">
              Filter section:
            </label>
            <select
              id="section-filter"
              value={sectionFilter ?? ''}
              onChange={(e) => setSectionFilter(e.target.value ? Number(e.target.value) : null)}
              className="input-field w-auto"
            >
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <section aria-labelledby="workflow-heading" className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 id="workflow-heading" className="mb-3 text-sm font-semibold text-slate-700">
            Publishing workflow {sectionFilter ? '(this section)' : '(all sections)'}
          </h2>
          <ul className="mb-3 flex flex-wrap gap-2">
            {SUMMARY_ORDER.map((st) => (
              <li key={st} className={`rounded border px-2 py-1 text-xs ${STATUS_BADGE[st]}`}>
                {STATUS_LABEL[st]}: <strong>{counts[st] ?? 0}</strong>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {BULK_STEPS.map(({ from, to, label }) => (
              <button
                key={to}
                type="button"
                onClick={() => runBulk(from, to)}
                disabled={bulkBusy || !counts[from]}
                className={`${to === 'PUBLISHED' ? 'btn-primary' : 'btn-secondary'} text-sm disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {label} ({counts[from] ?? 0})
              </button>
            ))}
          </div>
        </section>

        <div className="mb-6 flex flex-wrap gap-2">
          <span className="self-center text-sm font-medium text-slate-600">Auto-generate drafts (MOD-03):</span>
          {sections.map((s) => (
            <button key={s.id} type="button" onClick={() => generateForSection(s.id)} className="btn-secondary text-sm">
              {s.code}
            </button>
          ))}
        </div>

        <ScheduleBoard
          schedules={schedules}
          timeSlots={timeSlots}
          loading={loading}
          loadError={loadError}
          onMove={async (id, slotId) => {
            await scheduleApi.move(id, slotId);
          }}
          onDelete={async (id) => {
            await scheduleApi.delete(id);
          }}
          onTransition={async (id, to) => {
            await scheduleApi.transition(id, to);
          }}
          onRefresh={refresh}
        />
      </main>
    </div>
  );
}
