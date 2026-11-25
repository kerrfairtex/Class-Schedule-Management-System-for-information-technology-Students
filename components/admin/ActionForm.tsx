'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { apiPost } from '@/lib/api/client';

/**
 * A form that posts its fields to the admin API as `{ action, ...fields }`,
 * then refreshes the server-rendered page. Validation happens on the server;
 * its message is shown next to the button.
 */
export function ActionForm({
  action,
  submitLabel,
  successMessage,
  numberFields = [],
  booleanFields = [],
  extra = {},
  confirmText,
  className = '',
  resetOnSuccess = true,
  children,
}: {
  action: string;
  submitLabel: string;
  successMessage: string;
  numberFields?: string[];
  booleanFields?: string[];
  extra?: Record<string, unknown>;
  confirmText?: string;
  className?: string;
  resetOnSuccess?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirmText && !confirm(confirmText)) return;
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { action, ...extra };
    for (const [key, value] of form.entries()) {
      if (typeof value !== 'string') continue;
      if (numberFields.includes(key)) body[key] = Number(value);
      else if (value !== '') body[key] = value;
    }
    for (const key of booleanFields) body[key] = form.get(key) === 'on';

    setBusy(true);
    setMessage('');
    setError('');
    try {
      await apiPost('/api/admin', body);
      setMessage(successMessage);
      if (resetOnSuccess) formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className={className}>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <p aria-live="polite" className="text-sm">
          {message && <span className="text-seagrass">{message}</span>}
          {error && <span role="alert" className="text-coral">{error}</span>}
        </p>
      </div>
    </form>
  );
}

/** A small button that runs one admin action after confirmation. */
export function ActionButton({
  action,
  payload,
  label,
  confirmText,
  variant = 'secondary',
  ariaLabel,
}: {
  action: string;
  payload: Record<string, unknown>;
  label: string;
  confirmText?: string;
  variant?: 'secondary' | 'danger';
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError('');
    try {
      await apiPost('/api/admin', { action, ...payload });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        aria-label={ariaLabel}
        className={`${variant === 'danger' ? 'btn-danger' : 'btn-secondary'} min-h-[36px] px-3 py-1 text-xs`}
      >
        {busy ? 'Working…' : label}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-right text-xs text-coral">
          {error}
        </span>
      )}
    </span>
  );
}
