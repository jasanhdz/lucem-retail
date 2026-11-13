import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { assertE2eDatabaseIdentity, e2eChildEnv, safeE2eError } from './database';
import { seedE2e } from './seed';

async function prepare() {
  const env = e2eChildEnv();
  process.env.DATABASE_URL = env.DATABASE_URL;
  const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  try {
    await assertE2eDatabaseIdentity(db);
  } finally {
    await db.$disconnect();
  }
  const migration = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', env });
  if (migration.status !== 0) throw new Error(`prisma migrate deploy failed (exit ${migration.status ?? 'unknown'})`);
  await seedE2e();
}

prepare().catch(error => {
  console.error(`BLOCKED: E2E PostgreSQL unavailable: ${safeE2eError(error)}`);
  process.exitCode = 1;
});
