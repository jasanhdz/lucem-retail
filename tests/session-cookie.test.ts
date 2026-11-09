import { describe, expect, it, vi } from 'vitest';
import { sessionCookie } from '../src/lib/auth';

describe('session cookie', () => {
  it('sets a host-wide, httpOnly, same-site browser session', () => {
    expect(sessionCookie('opaque-token')).toBe('lucem_session=opaque-token; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax');
  });

  it('adds Secure in production and permits its removal only for the explicit loopback E2E mode', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousLoopback = process.env.E2E_HTTP_LOOPBACK;
    try {
      Reflect.set(process.env, 'NODE_ENV', 'production');
      delete process.env.E2E_HTTP_LOOPBACK;
      vi.resetModules();
      const productionAuth = await import('../src/lib/auth');
      expect(productionAuth.sessionCookie('opaque-token')).toContain('; Secure');
      process.env.E2E_HTTP_LOOPBACK = 'true';
      expect(productionAuth.sessionCookie('opaque-token')).not.toContain('; Secure');
    } finally {
      if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
      else Reflect.set(process.env, 'NODE_ENV', previousNodeEnv);
      if (previousLoopback === undefined) delete process.env.E2E_HTTP_LOOPBACK;
      else process.env.E2E_HTTP_LOOPBACK = previousLoopback;
      vi.resetModules();
    }
  });
});
