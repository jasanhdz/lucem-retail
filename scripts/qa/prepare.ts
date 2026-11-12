import { spawnSync } from 'node:child_process';
import { qaChildEnv } from './database';
import { ids, seedE2e } from '../e2e/seed';
import { requirePasswords } from '../e2e/database';
import { clearQaUploadsForBusinesses } from './storage';

async function main() {
  const env = await qaChildEnv();
  requirePasswords(env);
  Object.assign(process.env, env);
  const migration = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', env });
  if (migration.status !== 0) throw new Error(`QA Prisma migrations failed (exit ${migration.status ?? 'unknown'}).`);
  await seedE2e();
  const uploads = await clearQaUploadsForBusinesses([ids.centro, ids.norte], process.cwd(), env);
  process.stdout.write(`QA-owned product uploads reset: ${uploads?.removed ?? 0} file(s).\n`);
  process.stdout.write('QA database prepared with isolated synthetic fixtures.\n');
}
main().catch((error) => { process.stderr.write(`BLOCKED: QA preparation failed: ${error instanceof Error ? error.message : 'unknown error'}\n`); process.exitCode = 1; });
