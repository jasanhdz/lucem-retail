import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

function cli(args: string[], extraEnv: Record<string, string | undefined> = {}) {
  const env = { ...process.env, ...extraEnv };
  const runner = path.resolve('node_modules/tsx/dist/cli.mjs');
  const entry = path.resolve('scripts/qa/lucem-audit.ts');
  return spawnSync(process.execPath, [runner, entry, ...args], { cwd: process.cwd(), env, encoding: 'utf8', timeout: 120_000 });
}

describe('Lucem QA Lab CLI contract', () => {
  it('prints real help and rejects unknown options', () => {
    const help = cli(['--help']);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('--functional');
    expect(help.stdout).toContain('--package');
    const invalid = cli(['--not-a-mode']);
    expect(invalid.status).not.toBe(0);
    expect(invalid.stderr).toContain('Unknown option');
  });

  it('blocks an invalid remote/staging target before starting a browser or web server', () => {
    const run = cli(['--functional'], { QA_DATABASE_URL: 'postgresql://lucem_qa:synthetic@example.invalid:5432/lucem_staging', QA_RUN: undefined, DATABASE_URL: undefined, E2E_DATABASE_URL: undefined });
    const output = `${run.stdout}\n${run.stderr}`;
    expect(run.status).not.toBe(0);
    expect(output).toContain('QA target must be loopback lucem_qa user/database on port 55433');
    expect(output).not.toContain('webServer');
    expect(output).not.toContain('Connected to database');
  });
});
