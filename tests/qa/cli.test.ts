import { describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

function cli(args: string[], extraEnv: Record<string, string | undefined> = {}) {
  const env = { ...process.env, ...extraEnv };
  const entry = path.resolve('scripts/qa/bin.cjs');
  return spawnSync(process.execPath, [entry, ...args], { cwd: process.cwd(), env, encoding: 'utf8', timeout: 120_000 });
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

  it('rejects a second mutating QA runner while the checkout fixture lease is held', async () => {
    const checkoutKey = createHash('sha256').update(path.resolve(process.cwd())).digest('hex').slice(0, 20);
    const lockPath = path.join(os.tmpdir(), `lucem-qa-${checkoutKey}.lock`);
    const holder = spawn('flock', ['--nonblock', '--conflict-exit-code', '75', lockPath, process.execPath, '-e', 'setTimeout(() => {}, 10000)'], { stdio: 'ignore' });
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const run = cli(['--functional']);
      expect(run.status).toBe(75);
      expect(`${run.stdout}\n${run.stderr}`).toContain('another QA run owns this checkout fixture namespace');
    } finally {
      const exited = new Promise<void>((resolve) => holder.once('exit', () => resolve()));
      holder.kill('SIGTERM');
      await exited;
    }
  });
});
