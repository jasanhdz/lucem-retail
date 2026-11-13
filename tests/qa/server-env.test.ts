import { describe, expect, it } from 'vitest';
import { qaServerEnvironment } from '../../scripts/qa/server-env';

const loopback = 'postgresql://lucem_qa:placeholder@127.0.0.1:55433/lucem_qa?schema=public';

describe('QA server environment isolation', () => {
  it('enables synthetic Cloudflare client headers only for the locked loopback security harness', () => {
    const env = qaServerEnvironment({ QA_RUN: '1', QA_LAB_RUN_LOCK_HELD: '1', QA_TEST_CF_HEADERS: '1', QA_SERVER_PORT: '3114', QA_DATABASE_URL: loopback, E2E_DATABASE_URL: loopback });
    expect(env).toMatchObject({ CLOUDFLARE_QUICK_TUNNEL_ENABLED: 'true', QA_SERVER_PORT: '3114', NEXT_DIST_DIR: '.next-qa' });
    expect(qaServerEnvironment({ ...env, QA_SERVER_PORT: '3113' }).CLOUDFLARE_QUICK_TUNNEL_ENABLED).toBe('false');
    expect(qaServerEnvironment({ ...env, QA_LAB_RUN_LOCK_HELD: undefined }).CLOUDFLARE_QUICK_TUNNEL_ENABLED).toBe('false');
  });

  it('keeps every other QA server explicitly Cloudflare-disabled', () => {
    expect(qaServerEnvironment({ QA_RUN: '1', QA_LAB_RUN_LOCK_HELD: '1', QA_DATABASE_URL: loopback, E2E_DATABASE_URL: loopback }).CLOUDFLARE_QUICK_TUNNEL_ENABLED).toBe('false');
  });

  it('isolates production diagnostics in a dedicated build directory', () => {
    expect(qaServerEnvironment({ QA_SERVER_MODE: 'production', QA_SERVER_PORT: '3115' })).toMatchObject({ NEXT_DIST_DIR: '.next-qa-production', QA_SERVER_PORT: '3115', CLOUDFLARE_QUICK_TUNNEL_ENABLED: 'false' });
    expect(qaServerEnvironment({ QA_SERVER_MODE: 'development-fresh' }).NEXT_DIST_DIR).toBe('.next-qa-04-dev');
    expect(qaServerEnvironment({ QA_SERVER_MODE: 'development' }).NEXT_DIST_DIR).toBe('.next-qa');
  });
});
