import { test, expect } from '@playwright/test';
import { ids } from '../../scripts/e2e/seed';

test('login, business selection and invalid credentials use the real API contract', async ({ request }) => {
  const invalid = await request.post('/api/auth/login', { data: { email: 'dev-test-01-admin@invalid.test', password: 'definitely-wrong-password' } });
  expect(invalid.status()).toBe(401);
  const login = await request.post('/api/auth/login', { data: { email: 'dev-test-01-admin@invalid.test', password: process.env.E2E_ADMIN_PASSWORD } });
  expect(login.status()).toBe(200);
  expect((await login.json()).redirect).toBe('/negocios');
  const businesses = await request.get('/api/businesses');
  expect(businesses.status()).toBe(200);
  const list = await businesses.json();
  expect(list.businesses.map((business: { name: string }) => business.name).sort()).toEqual(['DEV-TEST-01 Centro', 'DEV-TEST-01 Norte'].sort());
  const select = await request.post('/api/businesses/select', { data: { businessId: ids.norte } });
  expect(select.status()).toBe(200);
  expect(await select.json()).toEqual({ redirect: '/dashboard' });
  expect((await (await request.get('/api/businesses')).json()).activeBusinessId).toBe(ids.norte);
  const rejected = await request.post('/api/businesses/select', { data: { businessId: 'not-a-business' } });
  expect(rejected.status()).toBe(403);
  expect((await (await request.get('/api/businesses')).json()).activeBusinessId).toBe(ids.norte);
});

test('seller and inventory cannot select non-member Norte', async ({ browser }) => {
  for (const role of ['seller', 'inventory'] as const) {
    const context = await browser.newContext({ storageState: `playwright/.auth/${role}.json` });
    expect((await context.request.post('/api/businesses/select', { data: { businessId: ids.norte } })).status()).toBe(403);
    expect((await (await context.request.get('/api/businesses')).json()).activeBusinessId).toBe(ids.centro);
    await context.close();
  }
});

test('real role matrix protects write handlers without audit', async ({ browser, request }) => {
  const seller = await browser.newContext({ storageState: 'playwright/.auth/seller.json' });
  expect((await seller.request.post('/api/products', { data: {
    name: 'DEV-TEST-01 unauthorized product', categoryId: ids.centroCategory,
    variants: [{ sku: 'DEV-TEST-01-UNAUTHORIZED', cost: 1, price: 2 }],
  } })).status()).toBe(403);
  expect((await seller.request.post('/api/inventory', { data: {
    variantId: ids.centroNormal, quantity: 1, type: 'CORRECTION', reason: 'DEV-TEST-01 unauthorized',
  } })).status()).toBe(403);
  expect((await seller.request.post(`/api/sales/${ids.centroSaleOne}/cancel`, { data: {
    confirmation: true, reason: 'DEV-TEST-01 unauthorized',
  } })).status()).toBe(403);
  await seller.close();

  const inventory = await browser.newContext({ storageState: 'playwright/.auth/inventory.json' });
  expect((await inventory.request.post(`/api/sales/${ids.centroSaleOne}/cancel`, { data: {
    confirmation: true, reason: 'DEV-TEST-01 unauthorized',
  } })).status()).toBe(403);
  await inventory.close();
  expect((await request.get('/api/dashboard')).status()).toBe(401);
});

test('dashboard and catalog data remain isolated across all existing APIs', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
  const page = await context.newPage();
  expect((await (await page.request.get('/api/products')).json()).map((item: { sku: string }) => item.sku)).toEqual(expect.arrayContaining(['DEV-TEST-01-ZERO', 'DEV-TEST-01-LOW', 'DEV-TEST-01-NORMAL']));
  expect((await (await page.request.get('/api/inventory')).json()).every((item: { businessId: string }) => item.businessId === ids.centro)).toBeTruthy();
  expect((await (await page.request.get('/api/sales')).json()).map((sale: { id: string }) => sale.id)).toEqual(expect.arrayContaining([ids.centroSaleOne, ids.centroSaleTwo]));
  const center = await page.request.get('/api/dashboard');
  expect(center.status()).toBe(200);
  expect(await center.json()).toMatchObject({ gross: '250.00', net: '250.00', units: 3, cogs: '100.00', profit: '150.00', outOfStock: 1, lowStock: 1 });
  const northSelect = await page.request.post('/api/businesses/select', { data: { businessId: ids.norte } });
  expect(northSelect.status()).toBe(200);
  const north = await page.request.get('/api/dashboard');
  expect(await north.json()).toMatchObject({ gross: '0.00', net: '0.00', units: 0, cogs: '0.00', profit: '0.00', recent: [] });
  const products = await page.request.get('/api/products');
  expect((await products.json()).every((item: { sku: string }) => item.sku === 'DEV-TEST-01-NORTE')).toBeTruthy();
  expect((await (await page.request.get('/api/inventory')).json()).every((item: { businessId: string }) => item.businessId === ids.norte)).toBeTruthy();
  expect(await (await page.request.get('/api/sales')).json()).toEqual([]);
  expect((await page.request.get('/api/products/dev-test-01-centro-product')).status()).toBe(404);
  expect((await page.request.get(`/api/sales/${ids.centroSaleOne}`)).status()).toBe(404);
  await context.close();
});
