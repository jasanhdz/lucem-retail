import { Prisma } from '@prisma/client';
import { db } from './db';

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'>;
type AuditData = { businessId?: string; userId?: string; action: string; entityType: string; entityId?: string; metadata?: object };

export async function audit(data: AuditData, client: AuditClient = db, options: { failForTesting?: boolean } = {}) {
  if (options.failForTesting && process.env.NODE_ENV !== 'production') throw new Error('audit-injected');
  await client.auditLog.create({ data: { ...data, metadata: data.metadata ?? {} } });
}

export function auditOptionsForRequest(req: Request) {
  return {
    failForTesting: req.headers.get('x-lucem-e2e-fail-audit') === '1' && process.env.NODE_ENV !== 'production' && process.env.E2E_AUDIT_FAILURES === '1' && Boolean(process.env.E2E_DATABASE_URL?.includes('lucem_retail_e2e')),
  };
}
