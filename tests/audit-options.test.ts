import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditOptionsForRequest } from '../src/lib/audit';

const request = new Request('http://127.0.0.1/api/test', { headers: { 'x-lucem-e2e-fail-audit': '1' } });

afterEach(() => vi.unstubAllEnvs());

describe('QA-scoped audit failure injection', () => {
  it('allows the injected audit failure for the exact loopback lucem_qa target under the runner lock', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('QA_RUN', '1');
    vi.stubEnv('QA_LAB_RUN_LOCK_HELD', '1');
    vi.stubEnv('QA_DATABASE_URL', 'postgresql://lucem_qa:placeholder@127.0.0.1:55433/lucem_qa?schema=public');
    vi.stubEnv('E2E_DATABASE_URL', process.env.QA_DATABASE_URL!);
    vi.stubEnv('E2E_AUDIT_FAILURES', '1');
    expect(auditOptionsForRequest(request).failForTesting).toBe(true);
  });

  it('preserves the existing dedicated legacy E2E target guard', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('QA_RUN', '');
    vi.stubEnv('E2E_DATABASE_URL', 'postgresql://lucem_e2e:placeholder@127.0.0.1:55432/lucem_retail_e2e?schema=public');
    vi.stubEnv('E2E_AUDIT_FAILURES', '1');
    expect(auditOptionsForRequest(request).failForTesting).toBe(true);
  });

  it.each([
    ['missing QA lock', { QA_LAB_RUN_LOCK_HELD: '' }],
    ['wrong port', { QA_DATABASE_URL: 'postgresql://lucem_qa:placeholder@127.0.0.1:55432/lucem_qa?schema=public' }],
    ['remote host', { QA_DATABASE_URL: 'postgresql://lucem_qa:placeholder@example.test:55433/lucem_qa?schema=public' }],
    ['production', { NODE_ENV: 'production' }],
  ])('rejects QA audit injection for %s', (_label, overrides) => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('QA_RUN', '1');
    vi.stubEnv('QA_LAB_RUN_LOCK_HELD', '1');
    vi.stubEnv('QA_DATABASE_URL', 'postgresql://lucem_qa:placeholder@127.0.0.1:55433/lucem_qa?schema=public');
    vi.stubEnv('E2E_DATABASE_URL', process.env.QA_DATABASE_URL!);
    vi.stubEnv('E2E_AUDIT_FAILURES', '1');
    for (const [key, value] of Object.entries(overrides)) vi.stubEnv(key as 'NODE_ENV', value);
    expect(auditOptionsForRequest(request).failForTesting).toBe(false);
  });
});
