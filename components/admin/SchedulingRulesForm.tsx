'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiPost } from '@/lib/api/client';
import type { SchedulingRules } from '@/lib/modules/mod-08-database-service/settings';

const HOUR_FIELDS: { key: 'maxFacultyHoursWeek' | 'maxFacultyHoursDay' | 'maxContinuousHours'; label: string; hint: string }[] = [
  { key: 'maxFacultyHoursWeek', label: 'Instructor hours per week', hint: 'Most teaching hours one instructor may have in a week.' },
  { key: 'maxFacultyHoursDay', label: 'Instructor hours per day', hint: 'Most teaching hours one instructor may have in a day.' },
  {
    key: 'maxContinuousHours',
    label: 'Hours in a row without a break',
    hint: 'For instructors and sections. A gap under 30 minutes does not count as a break.',
  },
];

/** Admin control for the limits every class is checked against. */
export function SchedulingRulesForm({ current }: { current: SchedulingRules }) {
  const router = useRouter();
  const [rules, setRules] = useState(current);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await apiPost('/api/admin', { action: 'set-scheduling-rules', data: rules });
      setMessage('Saved. New and edited classes are checked against these limits.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-lg border border-line bg-surface p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label-field">School day starts</span>
          <input
            type="time"
            className="input-field"
            step={900}
            required
            value={rules.dayStart}
            onChange={(e) => setRules({ ...rules, dayStart: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="label-field">School day ends</span>
          <input
            type="time"
            className="input-field"
            step={900}
            required
            value={rules.dayEnd}
            onChange={(e) => setRules({ ...rules, dayEnd: e.target.value })}
          />
        </label>
        {HOUR_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="label-field">{f.label}</span>
            <input
              type="number"
              inputMode="decimal"
              className="input-field"
              min={0.5}
              max={168}
              step={0.5}
              required
              value={rules[f.key]}
              onChange={(e) => setRules({ ...rules, [f.key]: Number(e.target.value) })}
            />
            <span className="hint">{f.hint}</span>
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-lagoon px-4 py-2 text-sm font-medium text-white hover:bg-lagoon-dark disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save rules'}
      </button>
      <div aria-live="polite">
        {message && <p className="text-sm text-seagrass">{message}</p>}
        {error && <p role="alert" className="text-sm text-coral">{error}</p>}
      </div>
    </form>
  );
}
