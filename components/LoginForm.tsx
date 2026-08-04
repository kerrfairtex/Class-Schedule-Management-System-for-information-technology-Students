'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
  title: string;
  subtitle: string;
  fields: { name: string; label: string; type?: string; placeholder: string }[];
  submitLabel: string;
  apiEndpoint: string;
  redirectTo: string;
  alternateLink?: { href: string; label: string };
}

export function LoginForm({
  title,
  subtitle,
  fields,
  submitLabel,
  apiEndpoint,
  redirectTo,
  alternateLink,
}: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fields.forEach((f) => {
      body[f.name] = formData.get(f.name) as string;
    });

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-primary">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {field.label}
                </label>
                <input
                  name={field.name}
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  required
                  className="input-field"
                />
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : submitLabel}
            </button>
          </form>

          {alternateLink && (
            <p className="mt-4 text-center text-sm text-slate-500">
              <Link href={alternateLink.href} className="text-primary hover:underline">
                {alternateLink.label}
              </Link>
            </p>
          )}

          <p className="mt-4 text-center text-sm">
            <Link href="/" className="text-slate-500 hover:text-primary">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
