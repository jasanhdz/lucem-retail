import type { PrismaClient } from '@prisma/client';
import { requireE2eDatabaseUrl } from './database';
import { clearE2eData } from './seed';

async function main() {
  const url = requireE2eDatabaseUrl();
  process.env.DATABASE_URL = url;
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  try {
    await clearE2eData(db);
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(`BLOCKED: E2E PostgreSQL unavailable: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
