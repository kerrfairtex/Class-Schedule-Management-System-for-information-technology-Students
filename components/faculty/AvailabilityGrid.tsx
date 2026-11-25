'use client';

import { useState } from 'react';
import { DAY_LABELS } from '@/lib/domain/constants';
import { formatRange } from '@/lib/modules/mod-03-schedule-engine/public-timetable';

export interface AvailabilitySlot {
  time_slot_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  /** A class is already scheduled in this period. */
  teaching?: string;
}

/**
 * Tap a period to mark it available or unavailable. Each change is saved at
 * once; if saving fails the period is switched back and the error shown.
 */
export function AvailabilityGrid({ days, slots }: { days: string[]; slots: AvailabilitySlot[] }) {
  const [state, setState] = useState(() => new Map(slots.map((s) => [s.time_slot_id, s.is_available])));
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function toggle(slot: AvailabilitySlot) {
    const next = !state.get(slot.time_slot_id);
    setState((m) => new Map(m).set(slot.time_slot_id, next));
    setSaving(slot.time_slot_id);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-availability', timeSlotId: slot.time_slot_id, isAvailable: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      const label = `${DAY_LABELS[slot.day_of_week]} ${formatRange(slot.start_time, slot.end_time)}`;
      setMessage(`${label}: ${next ? 'available' : 'unavailable'}. Saved.`);
    } catch (err) {
      setState((m) => new Map(m).set(slot.time_slot_id, !next));
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div aria-live="polite" className="mb-4 min-h-[1.5rem] text-sm">
        {message && <span className="text-seagrass">{message}</span>}
        {error && <span role="alert" className="text-coral">{error}</span>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((d) => (
          <fieldset key={d} className="rounded-lg border border-line bg-surface">
            <legend className="sr-only">{DAY_LABELS[d] ?? d}</legend>
            <p className="border-b border-line px-4 py-2 font-bold" aria-hidden="true">{DAY_LABELS[d] ?? d}</p>
            <ul className="divide-y divide-line">
              {slots
                .filter((s) => s.day_of_week === d)
                .map((s) => {
                  const available = state.get(s.time_slot_id) ?? true;
                  return (
                    <li key={s.time_slot_id}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={available}
                        onClick={() => toggle(s)}
                        disabled={saving === s.time_slot_id}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-paper disabled:opacity-60"
                      >
                        <span>
                          <time className="font-semibold">{formatRange(s.start_time, s.end_time)}</time>
                          {s.teaching && <span className="block text-xs text-muted">Teaching {s.teaching}</span>}
                        </span>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                            available ? 'bg-seagrass-50 text-seagrass' : 'bg-coral-50 text-coral'
                          }`}
                        >
                          {available ? 'Available' : 'Unavailable'}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
