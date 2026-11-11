import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { verifyConnectedDatabase, verifyQaTarget } from './core';

export async function connectedQaUrl(env: Record<string, string | undefined> = process.env) {
  const url = await verifyQaTarget(env);
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const rows = await db.$queryRaw<Array<{ database: string; user: string }>>`SELECT current_database() AS database, current_user AS user`;
    await verifyConnectedDatabase(async () => rows[0], env);
  } finally { await db.$disconnect(); }
  return url;
}

export async function qaChildEnv(env: Record<string, string | undefined> = process.env): Promise<NodeJS.ProcessEnv> {
  const url = await connectedQaUrl(env);
  const sessionSecret = env.SESSION_SECRET ?? env.QA_SESSION_SECRET ?? randomBytes(48).toString('base64url');
  if (sessionSecret.length < 32) throw new Error('QA session secret must have at least 32 characters.');
  return { ...env, QA_DATABASE_URL: url, QA_RUN: '1', E2E_DATABASE_URL: url, E2E_DATABASE_USER: 'lucem_qa', DATABASE_URL: url, SESSION_SECRET: sessionSecret, CLOUDFLARE_QUICK_TUNNEL_ENABLED: 'false' } as unknown as NodeJS.ProcessEnv;
}
