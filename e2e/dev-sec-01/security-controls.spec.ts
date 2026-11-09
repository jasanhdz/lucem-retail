import { test, expect } from '@playwright/test';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

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
    responses.push(await request.post('/api/auth/login', { data: { email: adminEmail, password: 'invalid-temporary-password' } }));
  }
  expect(responses.every(response => response.status() === 401)).toBeTruthy();
  expect(new Set(await Promise.all(responses.map(response => response.text()))).size).toBe(1);
  const unknown = await request.post('/api/auth/login', { data: { email: 'absent-user@invalid.test', password: 'invalid-temporary-password' } });
  expect(unknown.status()).toBe(401);
  expect(await unknown.text()).toBe(await responses[0].text());
  const seller = await request.post('/api/auth/login', {
    data: { email: sellerEmail, password: process.env.E2E_SELLER_PASSWORD },
  });
  expect(seller.status()).toBe(200);
});

test('returns the same generic login failure for an inactive fixture account', async ({ request }) => {
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  try {
    await db.user.update({ where: { id: 'dev-test-01-admin' }, data: { active: false } });
    const inactive = await request.post('/api/auth/login', {
      data: { email: 'dev-test-01-admin@invalid.test', password: process.env.E2E_ADMIN_PASSWORD },
    });
    const absent = await request.post('/api/auth/login', {
      data: { email: 'absent-account@invalid.test', password: 'invalid-temporary-password' },
    });
    expect(inactive.status()).toBe(401);
    expect(await inactive.text()).toBe(await absent.text());
  } finally {
    await db.user.update({ where: { id: 'dev-test-01-admin' }, data: { active: true } });
    await db.$disconnect();
  }
});

test('issues a loopback login cookie with the documented session protections', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: { email: 'dev-test-01-seller@invalid.test', password: process.env.E2E_SELLER_PASSWORD },
    headers: { Host: '127.0.0.1:3101', 'X-Forwarded-Host': 'attacker.invalid', 'X-Forwarded-Proto': 'https' },
  });
  expect(response.status()).toBe(200);
  const cookie = response.headers()['set-cookie'] ?? '';
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
  expect(cookie).toContain('Path=/');
  expect(cookie).toContain('Max-Age=1800');
  expect(cookie).not.toContain('Secure');
});

test('ignores untrusted forwarded headers for protocol and generated locations', async ({ request }) => {
  const response = await request.get('/login', {
    headers: { Host: '127.0.0.1:3101', 'X-Forwarded-Host': 'attacker.invalid', 'X-Forwarded-Proto': 'http', 'X-Forwarded-For': '203.0.113.77' },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()['location'] ?? '').not.toContain('attacker.invalid');
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

    const north = await browser.newContext({ storageState: 'playwright/.auth/admin-norte.json' });
    try {
      expect((await north.request.get(photoPath)).status()).toBe(404);
    } finally { await north.close(); }
  } finally {
    await center.close();
    if (filename && /^[a-z0-9_-]{1,64}_[0-9a-f-]{36}\.png$/i.test(filename)) {
      await unlink(path.join(process.cwd(), 'public', 'uploads', 'products', filename)).catch(() => undefined);
    }
  }
});
