import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const password = process.env.E2E_ADMIN_PASSWORD ?? 'DevTestAdmin!2026Strong';
const db = new PrismaClient();
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

async function login(request: any) {
  const response = await request.post('/api/auth/login', { data: { email: 'dev-test-01-admin@invalid.test', password } });
  expect(response.status()).toBe(200);
  await request.post('/api/businesses/select', { data: { businessId: 'dev-test-01-centro' } });
}

async function sessionId(request: any) {
  const cookie = (await request.storageState()).cookies.find((item: { name: string }) => item.name === 'lucem_session');
  expect(cookie?.value).toBeTruthy();
  const session = await db.session.findUniqueOrThrow({ where: { tokenHash: hash(cookie.value) } });
  return session.id;
}

test.describe.configure({ mode: 'serial' });

test.afterAll(async () => { await db.$disconnect(); });

test('renews the browser cookie and PostgreSQL idle expiry only from a Route Handler', async ({ request }) => {
  await login(request);
  const id = await sessionId(request);
  const before = new Date(Date.now() + 4 * 60 * 1000);
  await db.session.update({ where: { id }, data: { expiresAt: before, lastActivityAt: new Date(Date.now() - 10 * 60 * 1000) } });
  const response = await request.get('/api/dashboard');
  expect(response.status()).toBe(200);
  expect(response.headers()['set-cookie']).toContain('lucem_session=');
  const renewed = await db.session.findUniqueOrThrow({ where: { id } });
  expect(renewed.expiresAt.getTime()).toBeGreaterThan(before.getTime());
});

test('does not renew a revoked session and logout remains effective', async ({ request }) => {
  await login(request);
  const id = await sessionId(request);
  await db.session.delete({ where: { id } });
  const revoked = await request.get('/api/dashboard');
  expect(revoked.status()).toBe(401);
  expect(revoked.headers()['set-cookie'] ?? '').not.toContain('lucem_session=');

  await login(request);
  expect((await request.post('/api/auth/logout')).status()).toBe(200);
  expect((await request.get('/api/dashboard')).status()).toBe(401);
});

test('rolls back a sale when its atomic audit fails, then retries idempotently', async ({ request }) => {
  await login(request);
  const before = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === 'DEV-TEST-01-NORMAL');
  const body = { items: [{ variantId: 'dev-test-01-centro-normal', quantity: 1 }], paymentMethod: 'CARD', idempotencyKey: 'DEV-10-sale-audit-failure' };
  const failed = await request.post('/api/sales', { data: body, headers: { 'x-lucem-e2e-fail-audit': '1' } });
  expect(failed.status()).toBe(400);
  const afterFailure = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === 'DEV-TEST-01-NORMAL');
  expect(afterFailure.available).toBe(before.available);
  expect((await request.get('/api/sales?search=DEV-10-sale-audit-failure')).json()).resolves.toEqual([]);
  const retry = await request.post('/api/sales', { data: body });
  expect(retry.status()).toBe(201);
  const replay = await request.post('/api/sales', { data: body });
  expect(replay.status()).toBe(201);
  expect((await replay.json()).id).toBe((await retry.json()).id);
});

test('rolls back inventory and reservation writes when atomic audits fail', async ({ request }) => {
  await login(request);
  const inventoryReason = 'DEV-10 inventory audit failure';
  const failedInventory = await request.post('/api/inventory', { data: { variantId: 'dev-test-01-centro-normal', type: 'PURCHASE', quantity: 1, reason: inventoryReason }, headers: { 'x-lucem-e2e-fail-audit': '1' } });
  expect(failedInventory.status()).toBe(409);
  expect((await (await request.get('/api/inventory/movements?q=DEV-10%20inventory')).json()).items).toHaveLength(0);
  const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
  const failedReservation = await request.post('/api/reservations', { data: { variantId: 'dev-test-01-centro-normal', quantity: 1, expiresAt, notes: 'DEV-10 reservation audit failure' }, headers: { 'x-lucem-e2e-fail-audit': '1' } });
  expect(failedReservation.status()).toBe(400);
  expect((await request.get('/api/reservations')).json()).resolves.not.toContainEqual(expect.objectContaining({ notes: 'DEV-10 reservation audit failure' }));
  expect((await request.post('/api/inventory', { data: { variantId: 'dev-test-01-centro-normal', type: 'PURCHASE', quantity: 1, reason: inventoryReason } })).status()).toBe(200);
  expect((await request.post('/api/reservations', { data: { variantId: 'dev-test-01-centro-normal', quantity: 1, expiresAt, notes: 'DEV-10 reservation retry' } })).status()).toBe(201);
});
