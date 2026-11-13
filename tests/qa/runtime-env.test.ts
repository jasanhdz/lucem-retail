import { afterEach, describe, expect, it } from 'vitest';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { loadAuthorizedQaEnv } = require('../../scripts/qa/runtime-env.cjs') as {
  loadAuthorizedQaEnv(root: string, env: Record<string, string | undefined>): Record<string, string | undefined>;
};
const temporary: string[] = [];
async function qaRoot(contents: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lucem-qa-runtime-'));
  temporary.push(root);
  await mkdir(path.join(root, '.qa-private'), { mode: 0o700 });
  await writeFile(path.join(root, '.qa-private', 'runtime.env'), contents, { mode: 0o600 });
  await chmod(path.join(root, '.qa-private'), 0o700);
  await chmod(path.join(root, '.qa-private', 'runtime.env'), 0o600);
  return root;
}
afterEach(async () => { await Promise.all(temporary.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe('authorized persisted QA runtime', () => {
  it('loads only allowlisted QA values and never imports database fallbacks', async () => {
    const root = await qaRoot([
      'QA_DATABASE_URL=postgresql://lucem_qa:secret@127.0.0.1:55433/lucem_qa',
      'E2E_ADMIN_PASSWORD=synthetic-admin',
      'DATABASE_URL=postgresql://other:secret@remote/production',
      'E2E_DATABASE_URL=postgresql://other:secret@remote/e2e',
      'E2E_DATABASE_USER=other',
    ].join('\n'));
    const env = loadAuthorizedQaEnv(root, { DATABASE_URL: 'untrusted', E2E_DATABASE_URL: 'untrusted' });
    expect(env.QA_DATABASE_URL).toContain('127.0.0.1:55433/lucem_qa');
    expect(env.E2E_ADMIN_PASSWORD).toBe('synthetic-admin');
    expect(env.DATABASE_URL).toBe('untrusted');
    expect(env.E2E_DATABASE_URL).toBe('untrusted');
  });

  it('allows an explicit QA URL override but rejects permission drift and duplicate keys', async () => {
    const root = await qaRoot('QA_DATABASE_URL=ignored\n');
    expect(loadAuthorizedQaEnv(root, { QA_DATABASE_URL: 'explicit-qa-url' }).QA_DATABASE_URL).toBe('explicit-qa-url');
    await chmod(path.join(root, '.qa-private', 'runtime.env'), 0o644);
    expect(() => loadAuthorizedQaEnv(root, {})).toThrow(/permissions/);
    await chmod(path.join(root, '.qa-private', 'runtime.env'), 0o600);
    await writeFile(path.join(root, '.qa-private', 'runtime.env'), 'QA_DATABASE_URL=one\nQA_DATABASE_URL=two\n');
    await chmod(path.join(root, '.qa-private', 'runtime.env'), 0o600);
    expect(() => loadAuthorizedQaEnv(root, {})).toThrow(/Duplicate key/);
  });

  it('does not use DATABASE_URL when the authorized QA URL is absent', async () => {
    const root = await qaRoot('DATABASE_URL=postgresql://user:secret@127.0.0.1:55433/lucem_qa\n');
    expect(() => loadAuthorizedQaEnv(root, { DATABASE_URL: 'also-untrusted' })).toThrow(/QA_DATABASE_URL is unavailable/);
  });
});
