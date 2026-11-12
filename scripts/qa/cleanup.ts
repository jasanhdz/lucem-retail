import { qaChildEnv } from './database';
import { clearE2eData } from '../e2e/seed';
import { PrismaClient } from '@prisma/client';
import { ids } from '../e2e/seed';
import { clearQaUploadsForBusinesses } from './storage';

async function main() {
  const env = await qaChildEnv(); Object.assign(process.env, env);
  const url = env.QA_DATABASE_URL!;
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const identity = await db.$queryRaw<Array<{ database: string; user: string }>>`SELECT current_database() AS database, current_user AS user`;
    if (identity[0]?.database !== 'lucem_qa' || identity[0]?.user !== 'lucem_qa') throw new Error('Refusing cleanup: connected identity changed.');
    await clearE2eData(db);
    const uploads = await clearQaUploadsForBusinesses([ids.centro, ids.norte], process.cwd(), env);
    if (process.env.QA_RUN !== '1') throw new Error('Refusing upload cleanup without QA_RUN=1.');
    process.stdout.write(`QA namespace cleanup verified; removed ${uploads?.removed ?? 0} owned upload(s).\n`);
  } finally { await db.$disconnect(); }
}
main().catch((error) => { process.stderr.write(`BLOCKED: QA cleanup failed: ${error instanceof Error ? error.message : 'unknown error'}\n`); process.exitCode = 1; });
