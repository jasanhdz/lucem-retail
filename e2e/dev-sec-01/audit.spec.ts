import { test, expect, type APIRequestContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { ids } from '../../scripts/e2e/seed';
import { consumeRateLimitBucket } from '../../src/lib/abuse-limits';

const sensitiveKeys = new Set(['passwordhash', 'tokenhash', 'password', 'token', 'session', 'sessions', 'cookie', 'secret']);

function assertNoSensitiveKeys(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSensitiveKeys(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    expect(sensitiveKeys.has(key.toLowerCase()), `sensitive response key at ${path}`).toBeFalsy();
    assertNoSensitiveKeys(child, `${path}.${key}`);
  }
}

async function audit(request: APIRequestContext) {
  const response = await request.get('/api/audit');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body)).toBeTruthy();
  assertNoSensitiveKeys(body);
  return body as Array<Record<string, unknown>>;
}

test('preserves unauthenticated and role authorization contracts', async ({ request, browser }) => {
  expect((await request.get('/api/audit')).status()).toBe(401);
  for (const role of ['seller', 'inventory'] as const) {
    const context = await browser.newContext({ storageState: `playwright/.auth/${role}.json` });
    expect((await context.request.get('/api/audit')).status()).toBe(403);
    await context.close();
  }
});

test('returns only safe, isolated audit rows for each selected business', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'playwright/.auth/admin-isolation.json' });
  const center = await audit(context.request);
  expect(center.map(row => row.id)).toContain(ids.centroAudit);
  expect(center.map(row => row.id)).not.toContain(ids.norteAudit);
  expect(center.every(row => row.businessId === ids.centro)).toBeTruthy();
  for (const row of center) {
    if (row.user) expect(Object.keys(row.user as object).sort()).toEqual(['active', 'email', 'id', 'name']);
  }

  expect((await context.request.post('/api/businesses/select', { data: { businessId: ids.norte } })).status()).toBe(200);
  const north = await audit(context.request);
  expect(north.map(row => row.id)).toContain(ids.norteAudit);
  expect(north.map(row => row.id)).not.toContain(ids.centroAudit);
  expect(north.every(row => row.businessId === ids.norte)).toBeTruthy();
  expect(north.length).toBeLessThanOrEqual(100);
  expect(north.map(row => new Date(String(row.createdAt)).getTime())).toEqual(
    [...north].sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()).map(row => new Date(String(row.createdAt)).getTime()),
  );
  await context.close();
});

test('persists the general-write dimension and purges expired buckets in bounded batches', async () => {
  const db = new PrismaClient();
  const now = new Date();
  const expiredAt = new Date(now.getTime() - 1);
  const futureAt = new Date(now.getTime() + 60 * 60_000);
  const prefix = 'f'.repeat(60);
  const activeHash = `${prefix}0501`;
  try {
    const writes = await Promise.all(Array.from({ length: 3 }, () =>
      consumeRateLimitBucket('general-write', 'dev-sec-general-write', 60 * 60_000, 2),
    ));
    expect(writes.filter(result => result.allowed)).toHaveLength(2);
    expect(writes.filter(result => !result.allowed)).toHaveLength(1);

    await db.$executeRaw`INSERT INTO "AbuseRateLimitBucket" ("keyHash", "windowStart", "count", "expiresAt")
      SELECT ${prefix} || lpad(value::text, 4, '0'), ${new Date(now.getTime() - 2 * 60 * 60_000)}, 1, ${expiredAt}
      FROM generate_series(0, 500) AS value`;
    await db.abuseRateLimitBucket.create({ data: { keyHash: activeHash, windowStart: now, expiresAt: futureAt, count: 1 } });

    await consumeRateLimitBucket('general-write', 'dev-sec-purge-trigger', 60 * 60_000, 2, now);
    expect(await db.abuseRateLimitBucket.count({ where: { expiresAt: expiredAt } })).toBe(1);
    expect(await db.abuseRateLimitBucket.count({ where: { keyHash: activeHash } })).toBe(1);
  } finally {
    await db.abuseRateLimitBucket.deleteMany({ where: { keyHash: { startsWith: prefix } } });
    await db.$disconnect();
  }
});
