import { describe, expect, it } from 'vitest';
import { assertE2eDatabaseIdentity, requireE2eDatabaseUrl, safeE2eError } from '../scripts/e2e/database';

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
    expect(requireE2eDatabaseUrl({ QA_RUN: '1', QA_LAB_RUN_LOCK_HELD: '1', QA_DATABASE_URL: qa, E2E_DATABASE_URL: qa, E2E_DATABASE_USER: 'lucem_qa' })).toBe(qa);
    expect(() => requireE2eDatabaseUrl({ QA_RUN: '1', QA_DATABASE_URL: qa, E2E_DATABASE_URL: qa, E2E_DATABASE_USER: 'lucem_qa' })).toThrow('serialized Lucem QA Lab runner');
    expect(() => requireE2eDatabaseUrl({ QA_RUN: '1', QA_LAB_RUN_LOCK_HELD: '1', E2E_DATABASE_URL: valid, DATABASE_URL: valid })).toThrow('QA_DATABASE_URL is required');
    expect(() => requireE2eDatabaseUrl({ QA_RUN: '1', QA_LAB_RUN_LOCK_HELD: '1', QA_DATABASE_URL: qa, E2E_DATABASE_URL: valid, E2E_DATABASE_USER: 'lucem_qa' })).toThrow('must equal');
    expect(() => requireE2eDatabaseUrl({ QA_RUN: '1', QA_LAB_RUN_LOCK_HELD: '1', QA_DATABASE_URL: qa.replace('55433', '5432'), E2E_DATABASE_URL: qa.replace('55433', '5432') })).toThrow('port 55433');
  });

  it('checks the connected database and role against the explicitly configured target', async () => {
    const validIdentity = { database: 'lucem_retail_e2e', user: 'lucem_e2e', serverVersion: '160002', serverPort: 5432, isSuperuser: false };
    const client = (identity: typeof validIdentity) => ({ $queryRaw: async () => [identity] }) as never;
    await expect(assertE2eDatabaseIdentity(client(validIdentity), { E2E_DATABASE_URL: valid })).resolves.toMatchObject(validIdentity);
    await expect(assertE2eDatabaseIdentity(client({ ...validIdentity, database: 'lucem_qa', user: 'lucem_qa' }), { E2E_DATABASE_URL: valid })).rejects.toThrow('lucem_retail_e2e/lucem_e2e');
    await expect(assertE2eDatabaseIdentity(client({ ...validIdentity, serverVersion: '170000' }), { E2E_DATABASE_URL: valid })).rejects.toThrow('lucem_retail_e2e/lucem_e2e');
    await expect(assertE2eDatabaseIdentity(client({ ...validIdentity, serverPort: 55432 }), { E2E_DATABASE_URL: valid })).rejects.toThrow('lucem_retail_e2e/lucem_e2e');
    await expect(assertE2eDatabaseIdentity(client({ ...validIdentity, isSuperuser: true }), { E2E_DATABASE_URL: valid })).rejects.toThrow('least-privilege role');
    await expect(assertE2eDatabaseIdentity(client({ ...validIdentity, database: 'lucem_qa', user: 'lucem_qa', isSuperuser: true }), { QA_RUN: '1', QA_LAB_RUN_LOCK_HELD: '1', QA_DATABASE_URL: qa, E2E_DATABASE_URL: qa, E2E_DATABASE_USER: 'lucem_qa' })).resolves.toMatchObject({ database: 'lucem_qa', user: 'lucem_qa', isSuperuser: true });
  });

  it('redacts database URLs from operational errors', () => {
    const safe = safeE2eError(new Error('connection failed for postgresql://lucem_e2e:secret@127.0.0.1:55432/lucem_retail_e2e'));
    expect(safe).not.toContain('secret');
    expect(safe).toContain('[redacted database URL]');
  });
});
