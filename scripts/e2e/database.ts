import { URL } from 'node:url';
import type { PrismaClient } from '@prisma/client';

export const E2E_DATABASE_NAME = 'lucem_retail_e2e';
export const E2E_DATABASE_PORT = '55432';
export const E2E_DATABASE_USER = 'lucem_e2e';

export function safeE2eError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'unexpected E2E database error';
  return message.replace(/(?:postgres|postgresql):\/\/[^\s"'`]+/gi, '[redacted database URL]');
}

export function requireE2eDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  if (env.QA_RUN === '1') {
    if (env.QA_LAB_RUN_LOCK_HELD !== '1') throw new Error('QA E2E runs must be launched by the serialized Lucem QA Lab runner.');
    const qaUrl = env.QA_DATABASE_URL;
    if (!qaUrl) throw new Error('QA_DATABASE_URL is required during QA_RUN; staging/DATABASE_URL fallback is forbidden.');
    let qa: URL;
    try { qa = new URL(qaUrl); } catch { throw new Error('QA_DATABASE_URL is not a valid PostgreSQL URL.'); }
    const host = qa.hostname.replace(/^\[|\]$/g, '');
    if (!['postgres:', 'postgresql:'].includes(qa.protocol) || !['localhost', '127.0.0.1', '::1'].includes(host) || qa.port !== '55433' || decodeURIComponent(qa.pathname.slice(1)) !== 'lucem_qa' || decodeURIComponent(qa.username) !== 'lucem_qa') throw new Error('QA_RUN requires loopback lucem_qa database/user on port 55433.');
    if (env.E2E_DATABASE_URL !== qaUrl) throw new Error('E2E_DATABASE_URL must equal the explicitly validated QA_DATABASE_URL.');
    if (env.E2E_DATABASE_USER && env.E2E_DATABASE_USER !== 'lucem_qa') throw new Error('E2E_DATABASE_USER must be lucem_qa for QA_RUN.');
    return qaUrl;
  }
  const raw = env.E2E_DATABASE_URL;
  if (!raw) throw new Error('E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.');
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new Error('E2E_DATABASE_URL is not a valid PostgreSQL URL.'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('E2E_DATABASE_URL must use PostgreSQL.');
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) throw new Error('E2E_DATABASE_URL host must be local/loopback.');
  const database = decodeURIComponent(parsed.pathname.slice(1));
  if (database !== E2E_DATABASE_NAME) throw new Error(`E2E_DATABASE_URL database must be exactly ${E2E_DATABASE_NAME}.`);
  if (parsed.port !== E2E_DATABASE_PORT) throw new Error(`E2E_DATABASE_URL must use dedicated port ${E2E_DATABASE_PORT}.`);
  if (decodeURIComponent(parsed.username) !== E2E_DATABASE_USER) throw new Error(`E2E_DATABASE_URL must use dedicated user ${E2E_DATABASE_USER}.`);
  if (env.E2E_DATABASE_USER && env.E2E_DATABASE_USER !== E2E_DATABASE_USER) throw new Error(`E2E_DATABASE_USER must be exactly ${E2E_DATABASE_USER}.`);
  return raw;
}

export async function assertE2eDatabaseIdentity(db: Pick<PrismaClient, '$queryRaw'>, env: Record<string, string | undefined> = process.env): Promise<{ database: string; user: string; serverVersion: string; serverPort: number; isSuperuser: boolean }> {
  requireE2eDatabaseUrl(env);
  const expected = env.QA_RUN === '1'
    ? { database: 'lucem_qa', user: 'lucem_qa' }
    : { database: E2E_DATABASE_NAME, user: E2E_DATABASE_USER };
  const identity = await db.$queryRaw<Array<{ database: string; user: string; serverVersion: string; serverPort: number; isSuperuser: boolean }>>`SELECT current_database() AS database, current_user AS user, current_setting('server_version_num') AS "serverVersion", inet_server_port() AS "serverPort", (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS "isSuperuser"`;
  const serverMajor = Math.floor(Number(identity[0]?.serverVersion) / 10_000);
  if (identity[0]?.database !== expected.database || identity[0]?.user !== expected.user || serverMajor !== 16 || identity[0]?.serverPort !== 5432 || (env.QA_RUN !== '1' && identity[0]?.isSuperuser)) {
    throw new Error(`Refusing database mutation: expected ${expected.database}/${expected.user}, a least-privilege role, PostgreSQL 16 and server port 5432.`);
  }
  return identity[0];
}

export function e2eChildEnv(env: Record<string, string | undefined> = process.env): NodeJS.ProcessEnv {
  const url = requireE2eDatabaseUrl(env);
  return { ...env, E2E_DATABASE_URL: url, DATABASE_URL: url } as unknown as NodeJS.ProcessEnv;
}

export function requirePasswords(env: Record<string, string | undefined> = process.env) {
  const values = {
    admin: env.E2E_ADMIN_PASSWORD,
    seller: env.E2E_SELLER_PASSWORD,
    inventory: env.E2E_INVENTORY_PASSWORD,
  };
  for (const [role, password] of Object.entries(values)) {
    if (!password || password.length < 12 || password === 'password' || password.includes('replace')) throw new Error(`E2E_${role.toUpperCase()}_PASSWORD is missing or weak.`);
  }
  return values as { admin: string; seller: string; inventory: string };
}
