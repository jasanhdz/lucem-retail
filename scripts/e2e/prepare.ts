import { spawnSync } from 'node:child_process';
import { e2eChildEnv, requireE2eDatabaseUrl } from './database';
import { seedE2e } from './seed';

async function prepare() {
  const env = e2eChildEnv();
  process.env.DATABASE_URL = env.DATABASE_URL;
  const migration = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', env });
  if (migration.status !== 0) throw new Error(`prisma migrate deploy failed (exit ${migration.status ?? 'unknown'})`);
  await seedE2e();
}

prepare().catch(error => {
  console.error(`BLOCKED: E2E PostgreSQL unavailable: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
