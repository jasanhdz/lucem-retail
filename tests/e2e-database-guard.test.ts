import { describe, expect, it } from 'vitest';
import { requireE2eDatabaseUrl } from '../scripts/e2e/database';

const valid = 'postgresql://lucem_e2e:placeholder@127.0.0.1:55432/lucem_retail_e2e?schema=public';
const qa = 'postgresql://lucem_qa:placeholder@127.0.0.1:55433/lucem_qa?schema=public';

describe('E2E database guard', () => {
  it('accepts only the explicit isolated URL', () => {
    expect(requireE2eDatabaseUrl({ E2E_DATABASE_URL: valid, E2E_DATABASE_USER: 'lucem_e2e' })).toBe(valid);
  });

  it.each([
    ['missing URL', {}],
    ['development fallback', { DATABASE_URL: valid }],
    ['wrong database', { E2E_DATABASE_URL: valid.replace('lucem_retail_e2e', 'lucem_retail') }],
    ['shared port', { E2E_DATABASE_URL: valid.replace('55432', '5432') }],
    ['non-loopback host', { E2E_DATABASE_URL: valid.replace('127.0.0.1', 'db') }],
    ['wrong user', { E2E_DATABASE_URL: valid.replace('lucem_e2e', 'postgres') }],
  ])('rejects %s', (_label, env) => {
    expect(() => requireE2eDatabaseUrl(env)).toThrow();
  });

  it('accepts the dedicated QA identity only under explicit QA_RUN', () => {
    expect(requireE2eDatabaseUrl({ QA_RUN: '1', QA_DATABASE_URL: qa, E2E_DATABASE_URL: qa, E2E_DATABASE_USER: 'lucem_qa' })).toBe(qa);
    expect(() => requireE2eDatabaseUrl({ QA_RUN: '1', E2E_DATABASE_URL: valid, DATABASE_URL: valid })).toThrow('QA_DATABASE_URL is required');
    expect(() => requireE2eDatabaseUrl({ QA_RUN: '1', QA_DATABASE_URL: qa, E2E_DATABASE_URL: valid, E2E_DATABASE_USER: 'lucem_qa' })).toThrow('must equal');
    expect(() => requireE2eDatabaseUrl({ QA_RUN: '1', QA_DATABASE_URL: qa.replace('55433', '5432'), E2E_DATABASE_URL: qa.replace('55433', '5432') })).toThrow('port 55433');
  });
});
