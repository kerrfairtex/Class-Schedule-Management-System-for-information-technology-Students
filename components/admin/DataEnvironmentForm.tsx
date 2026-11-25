'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiPost } from '@/lib/api/client';

const OPTIONS = [
  { value: 'DEMO', label: 'DEMO — sample data, hidden from the public site' },
  { value: 'VERIFIED', label: 'VERIFIED — checked against registrar records, public' },
  { value: 'PRODUCTION', label: 'PRODUCTION — fully authorized, public' },
] as const;

/**
 * Admin control for the deployment data environment (spec §63/§64). This is
 * the switch that lets published schedules appear on the public site.
 */
export function DataEnvironmentForm({ current, semesterName }: { current: string; semesterName: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [apply, setApply] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const goingPublic = value !== 'DEMO';
    const warning = goingPublic
      ? `Mark data as ${value}? Published schedules${apply && semesterName ? ` for ${semesterName}` : ''} will become visible to everyone. Only do this once the data has been checked against registrar records.`
      : `Mark data as DEMO? ${apply ? 'This semester’s schedules will disappear from the public site.' : 'New schedules will be hidden from the public site.'}`;
    if (!confirm(warning)) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const r = await apiPost<{ schedulesUpdated: number }>('/api/admin', {
        action: 'set-data-environment',
        value,
        applyToActiveSemester: apply,
      });
      setMessage(`Saved. ${apply ? `${r.schedulesUpdated} schedule(s) in ${semesterName ?? 'the active semester'} updated.` : ''}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border border-line bg-surface p-4">
      <label htmlFor="data-env" className="block text-sm font-medium text-ink">
        Data environment
      </label>
      <select
        id="data-env"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} />
        Also apply to existing schedules in {semesterName ?? 'the active semester'}
      </label>
      <button
        type="submit"
        disabled={saving || (value === current && !apply)}
        className="rounded-lg bg-lagoon px-4 py-2 text-sm font-medium text-white hover:bg-lagoon-dark disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <div aria-live="polite">
        {message && <p className="text-sm text-seagrass">{message}</p>}
        {error && <p role="alert" className="text-sm text-coral">{error}</p>}
      </div>
    </form>
  );
}
