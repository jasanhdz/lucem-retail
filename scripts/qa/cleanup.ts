import { qaChildEnv } from './database';
import { clearE2eData } from '../e2e/seed';
import { PrismaClient } from '@prisma/client';
import { lstat, rm } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const env = await qaChildEnv(); Object.assign(process.env, env);
  const url = env.QA_DATABASE_URL!;
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const identity = await db.$queryRaw<Array<{ database: string; user: string }>>`SELECT current_database() AS database, current_user AS user`;
    if (identity[0]?.database !== 'lucem_qa' || identity[0]?.user !== 'lucem_qa') throw new Error('Refusing cleanup: connected identity changed.');
    await clearE2eData(db);
    if (process.env.QA_RUN !== '1') throw new Error('Refusing upload cleanup without QA_RUN=1.');
    const qaRoot = path.resolve(process.cwd(), '.qa-uploads'); const uploads = path.resolve(qaRoot, 'products');
    if (path.dirname(uploads) !== qaRoot) throw new Error('Refusing upload cleanup: path escaped QA root.');
    try {
      const rootInfo = await lstat(qaRoot); if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error('QA upload root must be a real directory.');
      const uploadInfo = await lstat(uploads); if (uploadInfo.isSymbolicLink() || !uploadInfo.isDirectory()) throw new Error('QA upload directory must be a real directory.');
      await rm(uploads, { recursive: true });
    } catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error; }
    process.stdout.write('QA namespace cleanup verified.\n');
  } finally { await db.$disconnect(); }
}
main().catch((error) => { process.stderr.write(`BLOCKED: QA cleanup failed: ${error instanceof Error ? error.message : 'unknown error'}\n`); process.exitCode = 1; });
