import { describe, it, expect } from 'vitest';
import { initialPassword } from '@/lib/modules/mod-01-auth/service';

describe('initialPassword (new faculty, student and user logins)', () => {
  it('generates a random temporary password when none is given', () => {
    for (const blank of [undefined, null, '']) {
      const r = initialPassword(blank);
      expect(r).toMatchObject({ temporary: true });
      if ('password' in r) expect(r.password).toHaveLength(16);
    }
  });

  it('never falls back to a shared default', () => {
    const a = initialPassword(undefined);
    const b = initialPassword(undefined);
    expect('password' in a && 'password' in b && a.password !== b.password).toBe(true);
    for (const r of [a, b]) {
      if ('password' in r) expect(r.password).not.toMatch(/^(faculty|student|admin)123$/);
    }
  });

  it('keeps an admin-typed password of 8+ characters', () => {
    expect(initialPassword('correct-horse')).toEqual({ password: 'correct-horse', temporary: false });
    expect(initialPassword(224567777)).toEqual({ password: '224567777', temporary: false });
  });

  it('rejects a short admin-typed password', () => {
    expect(initialPassword('short')).toEqual({ error: 'Password must be at least 8 characters' });
  });
});
