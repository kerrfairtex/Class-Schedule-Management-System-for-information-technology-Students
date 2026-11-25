import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkLoginAllowed,
  LOGIN_WINDOW_MS,
  MAX_FAILURES_PER_ACCOUNT,
  MAX_FAILURES_PER_IP,
  recordLoginFailure,
  recordLoginSuccess,
  resetLoginThrottle,
} from '@/lib/modules/mod-01-auth/rate-limit';

const T0 = 1_000_000;

describe('login throttling (by account and by IP)', () => {
  beforeEach(() => resetLoginThrottle());

  it('blocks an account after 5 failures, even from different IPs', () => {
    for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i++) recordLoginFailure('admin', `10.0.0.${i}`, T0);
    expect(checkLoginAllowed('admin', '10.9.9.9', T0).allowed).toBe(false);
    expect(checkLoginAllowed('fac-001', '10.9.9.9', T0).allowed).toBe(true);
  });

  it('gives no username a bypass, including admin', () => {
    for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i++) recordLoginFailure('ADMIN', '1.1.1.1', T0);
    expect(checkLoginAllowed('admin', '1.1.1.1', T0).allowed).toBe(false);
  });

  it('blocks one IP spraying many accounts', () => {
    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) recordLoginFailure(`user${i}`, '2.2.2.2', T0);
    expect(checkLoginAllowed('someone-new', '2.2.2.2', T0).allowed).toBe(false);
    expect(checkLoginAllowed('someone-new', '3.3.3.3', T0).allowed).toBe(true);
  });

  it('lifts the block after the window and reports when', () => {
    for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i++) recordLoginFailure('fac-001', '4.4.4.4', T0);
    const blocked = checkLoginAllowed('fac-001', '4.4.4.4', T0 + 1000);
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: LOGIN_WINDOW_MS / 1000 - 1 });
    expect(checkLoginAllowed('fac-001', '4.4.4.4', T0 + LOGIN_WINDOW_MS).allowed).toBe(true);
  });

  it('clears the account counter after a successful login', () => {
    for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT - 1; i++) recordLoginFailure('fac-002', '5.5.5.5', T0);
    recordLoginSuccess('fac-002');
    recordLoginFailure('fac-002', '5.5.5.5', T0);
    expect(checkLoginAllowed('fac-002', '5.5.5.5', T0).allowed).toBe(true);
  });
});
