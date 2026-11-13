import type { PrismaClient } from '@prisma/client';
import { assertE2eDatabaseIdentity, requireE2eDatabaseUrl, safeE2eError } from './database';
import { clearE2eData } from './seed';

async function main() {
  const url = requireE2eDatabaseUrl();
  process.env.DATABASE_URL = url;
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  try {
    await assertE2eDatabaseIdentity(db);
    await clearE2eData(db);
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(`BLOCKED: E2E PostgreSQL unavailable: ${safeE2eError(error)}`);
  process.exitCode = 1;
});
