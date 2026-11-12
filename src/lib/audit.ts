import { Prisma } from '@prisma/client';
import { db } from './db';

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'>;
type AuditData = { businessId?: string; userId?: string; action: string; entityType: string; entityId?: string; metadata?: object };

export async function audit(data: AuditData, client: AuditClient = db, options: { failForTesting?: boolean } = {}) {
  if (options.failForTesting && process.env.NODE_ENV !== 'production') throw new Error('audit-injected');
  await client.auditLog.create({ data: { ...data, metadata: data.metadata ?? {} } });
}

function isDedicatedE2eDatabase(urlValue: string | undefined, databaseName: string, userName: string, port: string) {
  if (!urlValue) return false;
  try {
    const url = new URL(urlValue);
    return ['127.0.0.1', 'localhost', '::1'].includes(url.hostname.replace(/^\[|\]$/g, '')) &&
      url.port === port && decodeURIComponent(url.pathname.slice(1)) === databaseName && decodeURIComponent(url.username) === userName;
  } catch { return false; }
}

export function auditOptionsForRequest(req: Request) {
  const qaTarget = process.env.QA_RUN === '1' &&
    process.env.QA_LAB_RUN_LOCK_HELD === '1' &&
    process.env.E2E_DATABASE_URL === process.env.QA_DATABASE_URL &&
    isDedicatedE2eDatabase(process.env.QA_DATABASE_URL, 'lucem_qa', 'lucem_qa', '55433');
  const legacyE2eTarget = isDedicatedE2eDatabase(process.env.E2E_DATABASE_URL, 'lucem_retail_e2e', 'lucem_e2e', '55432');
  return {
    failForTesting: req.headers.get('x-lucem-e2e-fail-audit') === '1' && process.env.NODE_ENV !== 'production' && process.env.E2E_AUDIT_FAILURES === '1' && (legacyE2eTarget || qaTarget),
  };
}
