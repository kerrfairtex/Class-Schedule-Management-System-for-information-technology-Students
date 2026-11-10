'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Mark as mounted on client side
  useEffect(() => {
    setMounted(true);
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-midnight to-slate-900 px-4">
        <div className="w-full max-w-md">
          <div className="glass-card text-center animate-in">
            <Loader2 className="mx-auto h-8 w-8 text-cyber-teal animate-spin" />
            <p className="mt-4 text-slate-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // If logged in and auto-redirecting, the router.push above will handle navigation
  if (isLoggedIn && autoRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-midnight to-slate-900 px-4">
        <div className="w-full max-w-md">
          <div className="glass-card text-center animate-in">
            <Loader2 className="mx-auto h-8 w-8 text-cyber-teal animate-spin" />
            <p className="mt-4 text-slate-400">Redirecting...</p>
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
          rememberMe: formData.get('rememberMe') === 'on',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
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

  const animationClasses = prefersReducedMotion 
    ? '' 
    : 'animate-in stagger-1';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-midnight to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="glass-strong relative overflow-hidden animate-in" style={{ boxShadow: '0 25px 50px -12px rgba(6, 182, 212, 0.15)' }}>
          {/* Subtle animated background glow - disabled under reduced motion */}
          {!prefersReducedMotion && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-cyber-teal/5 via-transparent to-violet-500/5" aria-hidden="true" />
              <div className="absolute inset-0" aria-hidden="true">
                <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-cyber-teal/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              </div>
            </>
          )}
          
          <div className="relative p-8">
            <div className={`mb-8 text-center ${animationClasses}`}>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyber-teal/10 text-cyber-teal mb-4">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-serif">{title}</h1>
              <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 animate-in" role="alert" aria-live="polite">
                <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span id="error-message">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username/Email/ID Field */}
              <div>
                <label htmlFor="username" className="label-field">
                  Email or ID
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9v1.5a4.5 4.5 0 109 0z" />
                  </svg>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    className="input-field pl-10"
                    placeholder="Enter email, employee ID, or student ID"
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
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyber-cyan transition-colors focus:outline-none focus:ring-2 focus:ring-cyber-teal focus:ring-offset-2 focus:ring-offset-midnight rounded"
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

              {/* Remember Me + Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    name="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900/50 text-cyber-teal focus:ring-2 focus:ring-cyber-teal focus:ring-offset-2 focus:ring-offset-midnight transition-colors"
                    disabled={loading || success}
                  />
                  <span className="text-sm text-slate-300">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-cyber-teal hover:text-cyber-cyan transition-colors focus:outline-none focus:ring-2 focus:ring-cyber-teal focus:ring-offset-2 focus:ring-offset-midnight rounded"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button with Loading/Success States */}
              <button
                type="submit"
                disabled={loading || success}
                className="btn-primary w-full py-3 relative overflow-hidden"
                style={{ 
                  background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  boxShadow: '0 4px 14px 0 rgba(6, 182, 212, 0.3)'
                }}
              >
                <span className="relative flex items-center justify-center gap-2">
                  {loading && (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  )}
                  {success && (
                    <Check className="h-5 w-5 animate-in" style={{ animation: prefersReducedMotion ? 'none' : 'scale-in 0.3s ease-out' }} aria-hidden="true" />
                  )}
                  <span className={loading ? 'opacity-0' : success ? 'opacity-0' : 'opacity-100'}>
                    Sign In
                  </span>
                  <span className={loading ? 'opacity-100' : 'opacity-0'} style={{ position: 'absolute' }}>
                    Signing in...
                  </span>
                  <span className={success ? 'opacity-100' : 'opacity-0'} style={{ position: 'absolute' }}>
                    Welcome!
                  </span>
                </span>
                {/* Ripple effect - disabled under reduced motion */}
                {!prefersReducedMotion && (
                  <span className="absolute inset-0 bg-white/20 opacity-0 transition-opacity hover:opacity-100 active:opacity-0" aria-hidden="true" />
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              <Link href="/" className="hover:text-cyber-cyan transition-colors focus:outline-none focus:ring-2 focus:ring-cyber-teal focus:ring-offset-2 focus:ring-offset-midnight rounded">
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
