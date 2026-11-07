import { describe, expect, it } from 'vitest';
import { sessionCookie } from '../src/lib/auth';

describe('session cookie', () => {
  it('sets a host-wide, httpOnly, same-site browser session', () => {
    expect(sessionCookie('opaque-token')).toBe('lucem_session=opaque-token; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax');
  });
});
