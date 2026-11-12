import { test, expect } from '@playwright/test';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { consumeRateLimitBucket } from '../../src/lib/abuse-limits';

const tunnelHeaders = (ip: string) => ({ 'CF-Ray': 'b33fa3e6a1b2c3d4-DFW', 'CF-Visitor': '{"scheme":"https"}', 'CF-Connecting-IP': ip });

test('sets security headers on pages and API responses', async ({ request }) => {
  for (const path of ['/login', '/api/businesses']) {
    const response = await request.get(path);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers()['x-frame-options']).toBe('DENY');
    expect(response.headers()['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  }
});

test('rejects a cross-origin cookie-authenticated mutation without side effects', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ storageState: 'playwright/.auth/admin-centro.json' });
  const before = await context.request.get('/api/businesses');
  const beforeBody = await before.json();
  const rejected = await context.request.post('/api/businesses/select', {
    data: { businessId: beforeBody.activeBusinessId },
    headers: { Origin: 'https://attacker.invalid' },
  });
  expect(rejected.status()).toBe(403);
  const rejectedFetchOnly = await context.request.post('/api/businesses/select', {
    data: { businessId: beforeBody.activeBusinessId },
    headers: { 'Sec-Fetch-Site': 'cross-site' },
  });
  expect(rejectedFetchOnly.status()).toBe(403);
  const after = await context.request.get('/api/businesses');
  expect((await after.json()).activeBusinessId).toBe(beforeBody.activeBusinessId);
  await context.close();
  expect(baseURL).toContain('127.0.0.1');
});

test('accepts an explicitly same-origin cookie-authenticated mutation', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ storageState: 'playwright/.auth/admin-centro.json' });
  const response = await context.request.post('/api/businesses/select', {
    data: { businessId: 'dev-test-01-centro' },
    headers: { Origin: baseURL! },
  });
  expect(response.status()).toBe(200);
  await context.close();
});

test('throttles bad login attempts generically without blocking another fixture account', async ({ request }) => {
  const adminEmail = 'dev-test-01-admin@invalid.test';
  const sellerEmail = 'dev-test-01-seller@invalid.test';
  const responses = [];
  for (let attempt = 0; attempt < 7; attempt += 1) {
    responses.push(await request.post('/api/auth/login', { data: { email: adminEmail, password: 'invalid-temporary-password' }, headers: tunnelHeaders('198.51.100.10') }));
  }
  expect(responses.every(response => response.status() === 401)).toBeTruthy();
  expect(new Set(await Promise.all(responses.map(response => response.text()))).size).toBe(1);
  const validAfterEmailFailures = await request.post('/api/auth/login', {
    data: { email: adminEmail, password: process.env.E2E_ADMIN_PASSWORD },
    headers: tunnelHeaders('198.51.100.10'),
  });
  expect(validAfterEmailFailures.status()).toBe(200);
  const unknown = await request.post('/api/auth/login', { data: { email: 'absent-user@invalid.test', password: 'invalid-temporary-password' }, headers: tunnelHeaders('198.51.100.11') });
  expect(unknown.status()).toBe(401);
  expect(await unknown.text()).toBe(await responses[0].text());
  const seller = await request.post('/api/auth/login', {
    data: { email: sellerEmail, password: process.env.E2E_SELLER_PASSWORD },
    headers: tunnelHeaders('198.51.100.12'),
  });
  expect(seller.status()).toBe(200);

  const ipFailures = [];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    ipFailures.push(await request.post('/api/auth/login', {
      data: { email: `ip-failure-${attempt}@invalid.test`, password: 'invalid-temporary-password' },
      headers: tunnelHeaders('198.51.100.20'),
    }));
  }
  expect(ipFailures.every(response => response.status() === 401), `synthetic IP failure statuses: ${ipFailures.map(response => response.status()).join(',')}`).toBeTruthy();
  const validAfterIpFailures = await request.post('/api/auth/login', {
    data: { email: adminEmail, password: process.env.E2E_ADMIN_PASSWORD },
    headers: tunnelHeaders('198.51.100.20'),
  });
  expect(validAfterIpFailures.status()).toBe(200);
  let ipBlocked: Awaited<ReturnType<typeof request.post>> | undefined;
  for (let attempt = 0; attempt < 15 && !ipBlocked; attempt += 1) {
    const response = await request.post('/api/auth/login', {
      data: { email: `ip-failure-over-limit-${attempt}@invalid.test`, password: 'invalid-temporary-password' },
      headers: tunnelHeaders('198.51.100.20'),
    });
    if (response.status() === 429) ipBlocked = response;
    else expect(response.status()).toBe(401);
  }
  expect(ipBlocked, 'IP rate limit should trigger even if the fixed window rolls during the probe').toBeDefined();
  expect(Number(ipBlocked!.headers()['retry-after'])).toBeGreaterThan(0);
});

test('returns the same generic login failure for an inactive fixture account', async ({ request }) => {
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  try {
    await db.user.update({ where: { id: 'dev-test-01-inventory' }, data: { active: false } });
    const inactive = await request.post('/api/auth/login', {
      data: { email: 'dev-test-01-inventory@invalid.test', password: process.env.E2E_INVENTORY_PASSWORD },
      headers: tunnelHeaders('198.51.100.13'),
    });
    const absent = await request.post('/api/auth/login', {
      data: { email: 'absent-account@invalid.test', password: 'invalid-temporary-password' },
      headers: tunnelHeaders('198.51.100.14'),
    });
    expect(inactive.status(), 'inactive fixture should return the generic unauthorized status, not a residual throttle').toBe(401);
    expect(await inactive.text()).toBe(await absent.text());
  } finally {
    await db.user.update({ where: { id: 'dev-test-01-inventory' }, data: { active: true } });
    await db.$disconnect();
  }
});

test('issues a loopback login cookie with the documented session protections', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: { email: 'dev-test-01-seller@invalid.test', password: process.env.E2E_SELLER_PASSWORD },
    headers: { ...tunnelHeaders('198.51.100.15'), Host: '127.0.0.1:3101', 'X-Forwarded-Host': 'attacker.invalid', 'X-Forwarded-Proto': 'https' },
  });
  expect(response.status()).toBe(200);
  const cookie = response.headers()['set-cookie'] ?? '';
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
  expect(cookie).toContain('Path=/');
  expect(cookie).toContain('Max-Age=1800');
  expect(cookie).not.toContain('Secure');
});

test('registers under the public IP/global limits with an account-enumeration-safe response', async ({ request }) => {
  let acceptedBody = '';
  for (let index = 0; index < 4; index += 1) {
    const email = `dev-test-01-public-${index}@invalid.test`;
    const response = await request.post('/api/auth/register', {
      data: { name: `Public Beta ${index}`, email, password: 'PublicBeta!Strong1', confirmation: 'PublicBeta!Strong1', terms: true },
      headers: tunnelHeaders('198.51.100.25'),
    });
    expect(response.status()).toBe(202);
    const body = await response.text();
    expect(body).toContain('Registro recibido');
    if (index === 0) acceptedBody = body;
    expect(body).toBe(acceptedBody);
    expect(response.headers()['set-cookie']).toBeUndefined();
    if (index === 0) {
      const duplicate = await request.post('/api/auth/register', {
        data: { name: 'Different submitted name', email, password: 'PublicBeta!Strong1', confirmation: 'PublicBeta!Strong1', terms: true },
        headers: tunnelHeaders('198.51.100.25'),
      });
      expect(duplicate.status()).toBe(202);
      expect(await duplicate.text()).toBe(acceptedBody);
      expect(duplicate.headers()['set-cookie']).toBeUndefined();
    }
  }
  const ipLimit = await request.post('/api/auth/register', {
    data: { name: 'Public Beta blocked', email: 'dev-test-01-public-blocked@invalid.test', password: 'PublicBeta!Strong1', confirmation: 'PublicBeta!Strong1', terms: true },
    headers: tunnelHeaders('198.51.100.25'),
  });
  expect(ipLimit.status()).toBe(429);
  expect(ipLimit.headers()['retry-after']).toBeTruthy();

  const otherIp = await request.post('/api/auth/register', {
    data: { name: 'Public Beta other IP', email: 'dev-test-01-public-other-ip@invalid.test', password: 'PublicBeta!Strong1', confirmation: 'PublicBeta!Strong1', terms: true },
    headers: tunnelHeaders('198.51.100.26'),
  });
  expect(otherIp.status(), `second synthetic registration IP returned ${otherIp.status()}`).toBe(202);

  for (let index = 0; index < 13; index += 1) {
    const response = await request.post('/api/auth/register', {
      data: { name: `Public global ${index}`, email: `dev-test-01-public-global-${index}@invalid.test`, password: 'PublicBeta!Strong1', confirmation: 'PublicBeta!Strong1', terms: true },
      headers: tunnelHeaders(`198.51.100.${50 + index}`),
    });
    expect(response.status()).toBe(202);
  }
  const globalLimit = await request.post('/api/auth/register', {
    data: { name: 'Public global blocked', email: 'dev-test-01-public-global-blocked@invalid.test', password: 'PublicBeta!Strong1', confirmation: 'PublicBeta!Strong1', terms: true },
    headers: tunnelHeaders('198.51.100.99'),
  });
  expect(globalLimit.status()).toBe(429);
  expect(globalLimit.headers()['retry-after']).toBeTruthy();
});

test('serializes concurrent persistent rate bucket increments without lost updates', async () => {
  const results = await Promise.all(Array.from({ length: 12 }, () =>
    consumeRateLimitBucket('register-global', 'dev-test-01-concurrent-bucket', 60 * 60_000, 5),
  ));
  expect(results.filter((result) => result.allowed)).toHaveLength(5);
  expect(results.filter((result) => !result.allowed)).toHaveLength(7);
  expect(results.every((result) => result.count <= 6)).toBeTruthy();
});

test('ignores untrusted forwarded headers for protocol and generated locations', async ({ request }) => {
  const response = await request.get('/login', {
    headers: { Host: '127.0.0.1:3101', 'X-Forwarded-Host': 'attacker.invalid', 'X-Forwarded-Proto': 'http', 'X-Forwarded-For': '203.0.113.77' },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()['location'] ?? '').not.toContain('attacker.invalid');
});

test('applies persistent inventory, commercial-write, and commercial-read thresholds per business', async ({ browser }) => {
  const north = await browser.newContext({ storageState: 'playwright/.auth/admin-norte.json' });
  try {
    for (let index = 0; index < 2; index += 1) {
      expect((await north.request.post('/api/inventory', { data: {} })).status()).toBe(400);
      expect((await north.request.post('/api/sales', { data: {} })).status()).toBe(400);
    }
    expect((await north.request.get('/api/sales')).status()).toBe(200);
    expect((await north.request.get('/api/reservations')).status()).toBe(200);
    const inventoryBlocked = await north.request.post('/api/inventory', { data: {} });
    const commercialWriteBlocked = await north.request.post('/api/sales', { data: {} });
    const commercialReadBlocked = await north.request.get('/api/returns');
    for (const response of [inventoryBlocked, commercialWriteBlocked, commercialReadBlocked]) {
      expect(response.status()).toBe(429);
      expect(response.headers()['retry-after']).toBeTruthy();
    }
  } finally { await north.close(); }
});

test('limits business and product creation for their documented scopes', async ({ browser }) => {
  const admin = await browser.newContext({ storageState: 'playwright/.auth/admin-centro.json' });
  const db = new PrismaClient();
  const businessIds: string[] = [];
  const productIds: string[] = [];
  try {
    for (let index = 0; index < 2; index += 1) {
      const response = await admin.request.post('/api/businesses', {
        headers: { 'Idempotency-Key': `dev-sec-business-limit-${index}` },
        data: { name: `DEV-SEC business limit ${index}`, branchName: 'E2E', giro: 'servicios' },
      });
      expect(response.status()).toBe(201);
      businessIds.push((await response.json()).business.id);
    }
    const blockedBusiness = await admin.request.post('/api/businesses', {
      headers: { 'Idempotency-Key': 'dev-sec-business-limit-blocked' },
      data: { name: 'DEV-SEC business limit blocked', branchName: 'E2E', giro: 'servicios' },
    });
    expect(blockedBusiness.status()).toBe(429);
    expect(blockedBusiness.headers()['retry-after']).toBeTruthy();

    await admin.request.post('/api/businesses/select', { data: { businessId: 'dev-test-01-norte' } });
    for (let index = 0; index < 2; index += 1) {
      const response = await admin.request.post('/api/products', {
        data: {
          name: `DEV-TEST-01-rate-limited-product-${index}`,
          categoryId: 'dev-test-01-norte-category',
          variants: [{ sku: `DEV-TEST-01-RATE-${index}`, cost: 1, price: 2 }],
        },
      });
      expect(response.status()).toBe(201);
      productIds.push((await response.json()).id);
    }
    const blockedProduct = await admin.request.post('/api/products', {
      data: { name: 'DEV-TEST-01-rate-limited-product-blocked', categoryId: 'dev-test-01-norte-category', variants: [{ sku: 'DEV-TEST-01-RATE-BLOCKED', cost: 1, price: 2 }] },
    });
    expect(blockedProduct.status()).toBe(429);
    expect(blockedProduct.headers()['retry-after']).toBeTruthy();
  } finally {
    await admin.request.post('/api/businesses/select', { data: { businessId: 'dev-test-01-norte' } }).catch(() => undefined);
    for (const id of productIds) await admin.request.delete(`/api/products/${id}`).catch(() => undefined);
    await admin.request.post('/api/businesses/select', { data: { businessId: 'dev-test-01-centro' } }).catch(() => undefined);
    await db.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.businessCreationIdempotency.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.category.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.membership.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.business.deleteMany({ where: { id: { in: businessIds } } });
    });
    await db.$disconnect();
    await admin.close();
  }
});

test('restricts uploaded product images to the owning business', async ({ browser }) => {
  const center = await browser.newContext({ storageState: 'playwright/.auth/admin-centro.json' });
  let filename: string | undefined;
  try {
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4l8AAAAASUVORK5CYII=', 'base64');
    const upload = await center.request.post('/api/products/image', {
      multipart: { file: { name: 'business-scope.png', mimeType: 'image/png', buffer: image } },
    });
    expect(upload.status()).toBe(201);
    const photoPath = String((await upload.json()).photoPath);
    filename = photoPath.split('/').pop();
    expect(filename).toMatch(/^dev-test-01-centro_[0-9a-f-]{36}\.png$/);
    const category = (await (await center.request.get('/api/categories')).json()).find((row: { id: string }) => row.id === 'dev-test-01-centro-category');
    expect(category).toBeTruthy();
    const product = await center.request.post('/api/products', {
      data: {
        name: 'DEV-TEST-01 scoped image', categoryId: category.id, photoPath,
        variants: [{ sku: 'DEV-TEST-01-IMAGE-SCOPE', cost: 1, price: 2, stock: 1 }],
      },
    });
    expect(product.status()).toBe(201);
    const ownRead = await center.request.get(photoPath);
    expect(ownRead.status()).toBe(200);
    expect(ownRead.headers()['content-type']).toContain('image/png');

    const sameTenantOverflow = await center.request.post('/api/products/image', {
      multipart: { file: { name: 'business-quota.png', mimeType: 'image/png', buffer: image } },
    });
    expect(sameTenantOverflow.status()).toBe(429);

    const north = await browser.newContext({ storageState: 'playwright/.auth/admin-norte.json' });
    try {
      expect((await north.request.get(photoPath)).status()).toBe(404);
      const globalOverflow = await north.request.post('/api/products/image', {
        multipart: { file: { name: 'global-quota.png', mimeType: 'image/png', buffer: image } },
      });
      expect(globalOverflow.status()).toBe(429);
    } finally { await north.close(); }
  } finally {
    await center.close();
    if (filename && /^[a-z0-9_-]{1,64}_[0-9a-f-]{36}\.png$/i.test(filename)) {
      await unlink(path.join(process.cwd(), 'public', 'uploads', 'products', filename)).catch(() => undefined);
    }
  }
});
