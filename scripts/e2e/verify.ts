import { PrismaClient } from '@prisma/client';
import { assertE2eDatabaseIdentity, requireE2eDatabaseUrl, safeE2eError } from './database';

async function main() {
  const url = new URL(requireE2eDatabaseUrl());
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const identity = await assertE2eDatabaseIdentity(db);
    const host = url.hostname;
    const port = url.port;
    process.stdout.write(`Verified PostgreSQL ${Math.floor(Number(identity.serverVersion) / 10_000)} identity: database=${identity.database}, user=${identity.user}, role_superuser=${identity.isSuperuser}, endpoint=${host}:${port}, server_port=${identity.serverPort}.\n`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`BLOCKED: E2E PostgreSQL unavailable: ${safeE2eError(error)}\n`);
  process.exitCode = 1;
});
