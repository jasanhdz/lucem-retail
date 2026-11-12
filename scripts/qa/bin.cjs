#!/usr/bin/env node
const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const tsx = path.resolve(__dirname, '../../node_modules/tsx/dist/cli.mjs');
const args = process.argv.slice(2);
const entry = args[0] === '--prepare' ? 'prepare.ts' : args[0] === '--cleanup' ? 'cleanup.ts' : 'lucem-audit.ts';
const forwarded = entry === 'lucem-audit.ts' ? args : args.slice(1);
const script = path.resolve(__dirname, entry);
const run = [process.execPath, tsx, script, ...forwarded];
const env = { ...process.env, QA_LAB_RUN_LOCK_HELD: '1' };
const mutatingQaMode = entry !== 'lucem-audit.ts' || args.length === 0 || args.some((arg) => ['--functional', '--full', '--quick', '--visual', '--accessibility', '--performance'].includes(arg));

let result;
if (mutatingQaMode) {
  const flock = spawnSync('flock', ['--version'], { stdio: 'ignore' });
  if (flock.error || flock.status !== 0) {
    process.stderr.write('BLOCKED: util-linux flock is required to serialize QA fixture mutation.\n');
    process.exit(1);
  }
  const checkoutKey = crypto.createHash('sha256').update(path.resolve(process.cwd())).digest('hex').slice(0, 20);
  const lockPath = path.join(os.tmpdir(), `lucem-qa-${checkoutKey}.lock`);
  result = spawnSync('flock', ['--nonblock', '--conflict-exit-code', '75', lockPath, ...run], { stdio: 'inherit', env });
  if (result.status === 75) {
    process.stderr.write('BLOCKED: another QA run owns this checkout fixture namespace; no fixture setup or cleanup was attempted.\n');
  }
} else {
  result = spawnSync(run[0], run.slice(1), { stdio: 'inherit', env });
}
process.exit(result.status ?? 1);
