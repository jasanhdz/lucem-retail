import { PrismaClient } from '@prisma/client';
import { requireE2eDatabaseUrl } from './database';
import { clearE2eData } from './seed';

const url = requireE2eDatabaseUrl();
process.env.DATABASE_URL = url;
const db = new PrismaClient();
clearE2eData(db).then(() => db.$disconnect()).catch(error => { console.error(error instanceof Error ? error.message : 'E2E cleanup failed; no fallback database was used'); process.exitCode = 1; void db.$disconnect(); });
