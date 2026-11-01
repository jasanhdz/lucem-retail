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

test('dashboard contract and business data remain isolated', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
  const page = await context.newPage();
  const center = await page.request.get('/api/dashboard');
  expect(center.status()).toBe(200);
  expect(await center.json()).toMatchObject({ gross: '250.00', net: '250.00', units: 3, cogs: '100.00', profit: '150.00', outOfStock: 1, lowStock: 1 });
  const northSelect = await page.request.post('/api/businesses/select', { data: { businessId: ids.norte } });
  expect(northSelect.status()).toBe(200);
  const north = await page.request.get('/api/dashboard');
  expect(await north.json()).toMatchObject({ gross: '0.00', net: '0.00', units: 0, cogs: '0.00', profit: '0.00', recent: [] });
  const products = await page.request.get('/api/products');
  expect((await products.json()).every((item: { sku: string }) => item.sku === 'DEV-TEST-01-NORTE')).toBeTruthy();
  await context.close();
});
