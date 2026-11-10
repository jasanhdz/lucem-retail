import { afterEach, describe, expect, it, vi } from 'vitest';
import { configuredRateLimit } from '../src/lib/abuse-limits';

describe('configurable persistent rate-limit defaults', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses secure defaults and accepts a bounded operator override', () => {
    expect(configuredRateLimit('LOGIN_IP', 10)).toBe(10);
    vi.stubEnv('LUCEM_RATE_LIMIT_LOGIN_IP', '12');
    expect(configuredRateLimit('LOGIN_IP', 10)).toBe(12);
  });

  it('fails closed for unsafe operator values', () => {
    for (const value of ['0', '-1', '1.5', 'not-a-number', '101']) {
      vi.stubEnv('LUCEM_RATE_LIMIT_LOGIN_IP', value);
      expect(() => configuredRateLimit('LOGIN_IP', 10)).toThrow('Invalid rate limit configuration');
    }
  });

  it('honors test-only overrides only for the exact isolated E2E database', () => {
    vi.stubEnv('LUCEM_RATE_LIMIT_LOGIN_IP', '20');
    vi.stubEnv('E2E_LUCEM_RATE_LIMIT_LOGIN_IP', '2');
    vi.stubEnv('E2E_RATE_LIMIT_TEST', 'true');
    vi.stubEnv('E2E_DATABASE_URL', 'postgresql://lucem_e2e:test@127.0.0.1:55432/lucem_retail_e2e?schema=public');
    expect(configuredRateLimit('LOGIN_IP', 10)).toBe(2);
    vi.stubEnv('E2E_DATABASE_URL', 'postgresql://lucem_e2e:test@127.0.0.1:55432/lucem_staging?schema=public');
    expect(configuredRateLimit('LOGIN_IP', 10)).toBe(20);
  });
});
