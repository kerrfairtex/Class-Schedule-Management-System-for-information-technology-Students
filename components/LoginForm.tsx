'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { useIsClient } from '@/lib/hooks/client-state';

interface LoginFormProps {
  title: string;
  subtitle: string;
  autoRedirect?: boolean;
}

export function LoginForm({ 
  title, 
  subtitle,
  autoRedirect = true,
}: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  // Set when a student signs in: their information is public, no account needed.
  const [publicLink, setPublicLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const mounted = useIsClient();

  // Check existing session on mount
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.session && !cancelled) {
            setIsLoggedIn(true);
            if (autoRedirect) {
              router.push(data.redirect);
              router.refresh();
            }
          }
        }
      } catch {
        // No session or error - show login form
      } finally {
        if (!cancelled) setCheckedSession(true);
      }
    }
    checkSession();
    return () => { cancelled = true; };
  }, [router, autoRedirect, mounted]);

  // Render loading state only while checking session, then render form
  if (!mounted || !checkedSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
        <div className="w-full max-w-md">
          <div className="glass-card text-center">
            <Loader2 className="mx-auto h-8 w-8 text-lagoon animate-spin" />
            <p className="mt-4 text-muted">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // If logged in and auto-redirecting, the router.push above will handle navigation
  if (isLoggedIn && autoRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
        <div className="w-full max-w-md">
          <div className="glass-card text-center">
            <Loader2 className="mx-auto h-8 w-8 text-lagoon animate-spin" />
            <p className="mt-4 text-muted">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.get('username'),
          password: formData.get('password'),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        setPublicLink(res.status === 403 && data.redirect ? data.redirect : '');
        return;
      }
      setSuccess(true);
      setLoading(false);
      // Show success checkmark briefly before redirect
      setTimeout(() => {
        router.push(data.redirect);
        router.refresh();
      }, 600);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      if (!success) setLoading(false);
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-line bg-surface">
          
          <div className="p-6 sm:p-8">
            <div className="mb-8">
              <Link href="/" className="font-display text-lg font-extrabold tracking-tight text-lagoon">
                TRAC BSIT
              </Link>
              <h1 className="mt-4 text-2xl font-bold">{title}</h1>
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-3 rounded-lg bg-coral-50 border border-coral/40 px-4 py-3 text-sm text-coral" role="alert" aria-live="polite">
                <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span id="error-message">
                  {error}
                  {publicLink && (
                    <>
                      {' '}
                      <Link href={publicLink} className="font-medium text-lagoon underline underline-offset-2">
                        View class schedules
                      </Link>
                    </>
                  )}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username/Email/ID Field */}
              <div>
                <label htmlFor="username" className="label-field">
                  Email or ID
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9v1.5a4.5 4.5 0 109 0z" />
                  </svg>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    className="input-field pl-10"
                    placeholder="Employee ID or username"
                    disabled={loading || success}
                    aria-describedby={error ? 'error-message' : undefined}
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Field with Show/Hide Toggle */}
              <div>
                <label htmlFor="password" className="label-field">
                  Password
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    className="input-field pl-10 pr-12"
                    placeholder="Enter password"
                    disabled={loading || success}
                    aria-describedby={error ? 'error-message' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-lagoon-dark transition-colors focus:outline-none focus:ring-2 focus:ring-lagoon focus:ring-offset-2 focus:ring-offset-paper rounded"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    disabled={loading || success}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-lagoon hover:text-lagoon-dark transition-colors focus:outline-none focus:ring-2 focus:ring-lagoon focus:ring-offset-2 focus:ring-offset-paper rounded"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button with Loading/Success States */}
              <button
                type="submit"
                disabled={loading || success}
                className="btn-primary relative w-full py-3"
              >
                <span className="relative flex items-center justify-center gap-2">
                  {loading && (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  )}
                  {success && (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  )}
                  <span className={loading ? 'opacity-0' : success ? 'opacity-0' : 'opacity-100'}>
                    Sign In
                  </span>
                  <span className={loading ? 'opacity-100' : 'opacity-0'} style={{ position: 'absolute' }}>
                    Signing in...
                  </span>
                  <span className={success ? 'opacity-100' : 'opacity-0'} style={{ position: 'absolute' }}>
                    Signed in
                  </span>
                </span>
              </button>
            </form>

            <div className="mt-6 rounded-lg border border-lagoon/20 bg-lagoon-50 px-4 py-3 text-sm text-ink-soft">
              <strong className="text-ink">Student?</strong> You don&apos;t need an account.{' '}
              <Link href="/schedules" className="font-medium text-lagoon underline underline-offset-2">
                Find your class schedule
              </Link>{' '}
              or{' '}
              <Link href="/rooms" className="font-medium text-lagoon underline underline-offset-2">
                check room availability
              </Link>
              .
            </div>

            <p className="mt-6 text-center text-sm text-muted">
              <Link href="/" className="hover:text-lagoon-dark transition-colors focus:outline-none focus:ring-2 focus:ring-lagoon focus:ring-offset-2 focus:ring-offset-paper rounded">
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
