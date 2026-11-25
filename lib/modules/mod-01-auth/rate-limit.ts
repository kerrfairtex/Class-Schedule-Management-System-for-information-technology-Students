/**
 * Login throttling by account AND by client IP (failed attempts only).
 *
 *   - account: 5 failures per 15 minutes stops password guessing against one
 *     account, even from many IPs;
 *   - IP: 20 failures per 15 minutes stops one client spraying many accounts,
 *     while leaving room for a shared campus network.
 *
 * Successful logins are not counted, and a success clears that account's
 * counter. No username is exempt: an exemption for "demo" accounts used to
 * give the real `admin` account unlimited guesses.
 *
 * State is in memory, which is correct for the single Render instance. Move
 * it to a shared store (e.g. Redis) before running more than one instance.
 */

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_ACCOUNT = 5;
export const MAX_FAILURES_PER_IP = 20;

interface Bucket {
  failures: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function live(key: string, now: number): Bucket | undefined {
  const b = buckets.get(key);
  if (b && now >= b.resetAt) {
    buckets.delete(key);
    return undefined;
  }
  return b;
}

const accountKey = (username: string) => `user:${username.toLowerCase()}`;
const ipKey = (ip: string) => `ip:${ip}`;

/** Whether a login attempt may proceed, and when the block lifts if not. */
export function checkLoginAllowed(
  username: string,
  ip: string,
  now = Date.now()
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const blocking = [
    [live(accountKey(username), now), MAX_FAILURES_PER_ACCOUNT],
    [live(ipKey(ip), now), MAX_FAILURES_PER_IP],
  ] as const;
  for (const [bucket, max] of blocking) {
    if (bucket && bucket.failures >= max) {
      return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
    }
  }
  return { allowed: true };
}

export function recordLoginFailure(username: string, ip: string, now = Date.now()): void {
  for (const key of [accountKey(username), ipKey(ip)]) {
    const b = live(key, now);
    if (b) b.failures++;
    else buckets.set(key, { failures: 1, resetAt: now + LOGIN_WINDOW_MS });
  }
}

export function recordLoginSuccess(username: string): void {
  buckets.delete(accountKey(username));
}

/** Test helper. */
export function resetLoginThrottle(): void {
  buckets.clear();
}

// Drop expired buckets so the map cannot grow without bound.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) if (now >= b.resetAt) buckets.delete(key);
}, 60 * 1000);
sweep.unref?.();
