'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChangePasswordFormProps {
  mustChange: boolean;
}

export function ChangePasswordForm({ mustChange }: ChangePasswordFormProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to change password');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-seagrass/40 bg-seagrass-50 p-4 text-center">
        <p className="text-seagrass font-medium">Password changed successfully</p>
        <p className="text-muted text-sm mt-2">Redirecting...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-coral/40 bg-coral-50 p-3 text-sm text-coral">
          {error}
        </div>
      )}

      {!mustChange && (
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input-field"
            required
            autoComplete="current-password"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-ink-soft mb-1">
          New Password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="input-field"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted mt-1">Minimum 8 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-soft mb-1">
          Confirm New Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input-field"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  );
}
