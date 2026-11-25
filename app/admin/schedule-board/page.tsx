'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ScheduleBoard, STATUS_BADGE, useScheduleBoardData } from '@/components/ScheduleBoard';
import { ClassForm } from '@/components/ClassForm';
import { PortalLayout } from '@/components/PortalLayout';
import { scheduleApi, type LoadRow, type ScheduleOptions } from '@/lib/api/client';
import { STATUS_LABEL } from '@/lib/domain/schedule-status';
import type { Schedule, ScheduleStatus } from '@/lib/domain/types';
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
  const [options, setOptions] = useState<ScheduleOptions | null>(null);
  const [sectionFilter, setSectionFilter] = useState<number | null>(null);
  const [form, setForm] = useState<{ mode: 'add' } | { mode: 'edit'; entry: Schedule } | null>(null);
  const [load, setLoad] = useState<LoadRow[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const { schedules, timeSlots, loading, loadError, refresh } = useScheduleBoardData(sectionFilter);

  useEffect(() => {
    scheduleApi
      .getOptions()
      .then(setOptions)
      .catch((e: Error) => (e.message === 'Unauthorized' ? router.push('/login') : setError(`Could not load sets and subjects: ${e.message}`)));
  }, [router]);

  // Hours check for the selected set; refreshed whenever the board changes.
  useEffect(() => {
    if (!sectionFilter) return;
    let cancelled = false;
    scheduleApi
      .sectionLoad(sectionFilter)
      .then((rows) => !cancelled && setLoad(rows))
      .catch(() => !cancelled && setLoad([]));
    return () => {
      cancelled = true;
    };
  }, [sectionFilter, schedules]);

  const sections = options?.sections ?? [];
  const selectedSection = sections.find((s) => s.id === sectionFilter);
  const counts = schedules.reduce<Partial<Record<ScheduleStatus, number>>>((acc, s) => {
    const st = s.status ?? 'DRAFT';
    acc[st] = (acc[st] ?? 0) + 1;
    return acc;
  }, {});

  function notify(msg: string) {
    setMessage(msg);
    setError('');
  }

  async function generateForSection(sectionId: number, code: string) {
    setMessage('');
    setError('');
    try {
      const data = await scheduleApi.generate(sectionId);
      setMessage(
        `${code}: ${data.created} draft meeting(s) added.${data.errors?.length ? ` Still to do: ${data.errors.join('; ')}.` : ''}`
      );
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    }
  }

  async function runBulk(from: ScheduleStatus, to: ScheduleStatus) {
    const targets = schedules.filter((s) => (s.status ?? 'DRAFT') === from);
    if (targets.length === 0) return;
    if (to === 'PUBLISHED' && !confirm(`Publish ${targets.length} class meeting(s)? Students and the public site will see them.`)) {
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
    setMessage(`${targets.length - failures.length} of ${targets.length} class meeting(s) moved to ${STATUS_LABEL[to]}.`);
    if (failures.length) setError(failures.join('; '));
    setBulkBusy(false);
    refresh();
  }

  return (
    <PortalLayout role="admin" name="Administrator" links={navFor(ADMIN_NAV, '/admin/schedule-board')}>
      <h1 className="page-title">Schedule board</h1>
      <p className="page-lead">
        Build each set&apos;s week: lectures and labs of any length, on the days they meet. New classes start as drafts.
      </p>

      <div aria-live="polite" className="mt-4 space-y-2">
        {message && <div className="notice-success">{message}</div>}
        {error && (
          <div role="alert" className="notice-error">
            {error}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <button type="button" className="btn-primary" disabled={!options} onClick={() => setForm({ mode: 'add' })}>
          Add a class
        </button>
        <label>
          <span className="label-field">Show</span>
          <select
            value={sectionFilter ?? ''}
            onChange={(e) => {
              setSectionFilter(e.target.value ? Number(e.target.value) : null);
              setLoad([]);
            }}
            className="select-field w-auto"
          >
            <option value="">All sets</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>
        </label>
        {selectedSection && (
          <>
            <p className="pb-2 text-sm text-muted">
              Adviser: <strong className="text-ink">{selectedSection.adviser_name ?? 'not set'}</strong>
            </p>
            <button type="button" className="btn-secondary" onClick={() => generateForSection(selectedSection.id, selectedSection.code)}>
              Auto-fill drafts for {selectedSection.code}
            </button>
          </>
        )}
      </div>

      {form && options && (
        <div className="mt-6">
          <ClassForm
            key={form.mode === 'edit' ? form.entry.id : 'add'}
            options={options}
            editing={form.mode === 'edit' ? form.entry : undefined}
            defaultSectionId={sectionFilter}
            onSaved={(msg) => {
              notify(msg);
              setForm(null);
              refresh();
            }}
            onCancel={() => setForm(null)}
          />
        </div>
      )}

      {selectedSection && load.length > 0 && (
        <section aria-labelledby="hours-heading" className="mt-6">
          <h2 id="hours-heading" className="text-lg font-bold">Hours check for {selectedSection.code}</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="data-table min-w-[520px]">
              <thead>
                <tr>
                  <th scope="col">Subject</th>
                  <th scope="col">Part</th>
                  <th scope="col">Scheduled</th>
                  <th scope="col">Required</th>
                </tr>
              </thead>
              <tbody>
                {load.map((r) => {
                  const done = r.scheduled_hours >= r.required_hours && r.required_hours > 0;
                  const over = r.scheduled_hours > r.required_hours;
                  return (
                    <tr key={`${r.subject_id}-${r.component}`}>
                      <td>
                        <strong>{r.subject_code}</strong> <span className="text-ink-soft">{r.subject_name}</span>
                      </td>
                      <td>{r.component === 'LAB' ? 'Lab' : 'Lecture'}</td>
                      <td className={over ? 'text-coral' : done ? 'text-seagrass' : ''}>{r.scheduled_hours} h</td>
                      <td>
                        {r.required_hours} h{' '}
                        <span className="text-muted">
                          {over ? '(too many)' : done ? '(done)' : `(${Math.round((r.required_hours - r.scheduled_hours) * 10) / 10} h to go)`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="workflow-heading" className="card mt-6">
        <h2 id="workflow-heading" className="mb-3 text-sm font-bold">
          Publishing {sectionFilter ? `(${selectedSection?.code ?? 'this set'})` : '(all sets)'}
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
              className={to === 'PUBLISHED' ? 'btn-primary' : 'btn-secondary'}
            >
              {label} ({counts[from] ?? 0})
            </button>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <ScheduleBoard
          schedules={schedules}
          timeSlots={timeSlots}
          loading={loading}
          loadError={loadError}
          showSection={!sectionFilter}
          onMoveTo={async (id, day, start) => {
            await scheduleApi.moveTo(id, day, start);
          }}
          onDelete={async (id) => {
            await scheduleApi.delete(id);
          }}
          onTransition={async (id, to) => {
            await scheduleApi.transition(id, to);
          }}
          onEdit={(entry) => setForm({ mode: 'edit', entry })}
          onRefresh={refresh}
        />
      </div>
    </PortalLayout>
  );
}
