import { expect, request as playwrightRequest, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
const sku = 'DEV-TEST-01-NORMAL';

test.describe('DEV-06 apartados', () => {
  test('creates and releases a reservation with persisted balance transitions', async ({ page }) => {
    const request = page.request;
    const initial = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === sku);
    const created = await request.post('/api/reservations', { data: { variantId: initial.id, quantity: 2, expiresAt: new Date(Date.now() + 86400000).toISOString(), customerName: 'DEV-06 Cliente', notes: 'DEV-06 release' } });
    expect(created.status()).toBe(201);
    const reservation = await created.json();
    const held = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === sku);
    expect(Number(held.available)).toBe(Number(initial.available) - 2);
    expect(Number(held.reserved)).toBe(Number(initial.reserved) + 2);
    expect(Number(held.physical)).toBe(Number(initial.physical));
    const released = await request.post(`/api/reservations/${reservation.id}/release`, { data: { confirmation: true } });
    expect(released.status()).toBe(200);
    expect((await request.post(`/api/reservations/${reservation.id}/release`, { data: { confirmation: true } })).status()).toBe(200);
    const final = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === sku);
    expect(Number(final.available)).toBe(Number(initial.available));
    expect(Number(final.reserved)).toBe(Number(initial.reserved));
    expect(Number(final.physical)).toBe(Number(initial.physical));
  });

  test('rejects overbooking and concurrent reservations without negative stock', async ({ page }) => {
    const request = page.request;
    const variant = (await (await request.get('/api/products?available=true&q=DEV-TEST-01-LOW')).json())[0];
    const payload = { variantId: variant.id, quantity: 1, expiresAt: new Date(Date.now() + 86400000).toISOString(), notes: 'DEV-06 concurrency' };
    expect((await request.post('/api/reservations', { data: { ...payload, quantity: 999 } })).status()).toBe(409);
    const results = await Promise.all([request.post('/api/reservations', { data: payload }), request.post('/api/reservations', { data: payload })]);
    expect(results.filter((response) => response.status() === 201)).toHaveLength(1);
    for (const response of results) if (response.status() === 201) await request.post(`/api/reservations/${(await response.json()).id}/release`, { data: { confirmation: true } });
    const row = (await (await request.get('/api/inventory')).json()).find((item: { sku: string }) => item.sku === 'DEV-TEST-01-LOW');
    expect(Number(row.available)).toBeGreaterThanOrEqual(0);
  });

  test('expires an active reservation and restores its persisted balance', async ({ page }) => {
    const request = page.request;
    const initial = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === sku);
    const variant = (await (await request.get('/api/products?available=true&q=DEV-TEST-01-NORMAL')).json())[0];
    const created = await request.post('/api/reservations', { data: { variantId: variant.id, quantity: 1, expiresAt: new Date(Date.now() + 86400000).toISOString(), notes: 'DEV-06 expire' } });
    const reservation = await created.json();
    process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
    const { PrismaClient } = await import('@prisma/client');
    const db = new PrismaClient();
    await db.reservation.update({ where: { id: reservation.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await db.$disconnect();
    const expired = await request.post('/api/reservations/expire');
    expect(expired.status()).toBe(200);
    expect((await expired.json()).expired).toBeGreaterThanOrEqual(1);
    const final = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === sku);
    expect(Number(final.available)).toBe(Number(initial.available));
    expect(Number(final.reserved)).toBe(Number(initial.reserved));
  });

  test('converts once into a sale without double discount and records traceability', async ({ page }) => {
    const request = page.request;
    const initial = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === sku);
    const created = await request.post('/api/reservations', { data: { variantId: initial.id, quantity: 2, expiresAt: new Date(Date.now() + 86400000).toISOString(), notes: 'DEV-06 convert' } });
    const reservation = await created.json();
    const held = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === sku);
    const converted = await request.post(`/api/reservations/${reservation.id}/convert`, { data: { confirmation: true, paymentMethod: 'CARD' } });
    expect(converted.status()).toBe(200);
    const result = await converted.json();
    expect(result.saleId).toEqual(expect.any(String));
    const replay = await request.post(`/api/reservations/${reservation.id}/convert`, { data: { confirmation: true, paymentMethod: 'CARD' } });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).saleId).toBe(result.saleId);
    const final = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === sku);
    expect(Number(final.available)).toBe(Number(held.available));
    expect(Number(final.reserved)).toBe(Number(held.reserved) - 2);
    expect(Number(final.physical)).toBe(Number(held.physical) - 2);
    const movements = await request.get(`/api/inventory/movements?variantId=${initial.id}&pageSize=50`);
    expect(movements.status()).toBe(200);
    const items = (await movements.json()).items;
    expect(items.filter((item: { type: string; referenceId: string }) => item.type === 'RELEASE' && item.referenceId === reservation.id)).toHaveLength(1);
    expect(items.filter((item: { type: string; referenceId: string }) => item.type === 'SALE' && item.referenceId === reservation.id)).toHaveLength(1);
  });

  test('serializes concurrent conversion and authorizes INVENTORY_MANAGER', async ({ page, browser }) => {
    const request = page.request;
    const variant = (await (await request.get('/api/products?available=true&q=DEV-TEST-01-NORMAL')).json())[0];
    const created = await request.post('/api/reservations', { data: { variantId: variant.id, quantity: 1, expiresAt: new Date(Date.now() + 86400000).toISOString(), notes: 'DEV-06 concurrent convert' } });
    const reservation = await created.json();
    const responses = await Promise.all([request.post(`/api/reservations/${reservation.id}/convert`, { data: { confirmation: true, paymentMethod: 'TRANSFER' } }), request.post(`/api/reservations/${reservation.id}/convert`, { data: { confirmation: true, paymentMethod: 'TRANSFER' } })]);
    expect(responses.filter((response) => response.status() === 200)).toHaveLength(1);
    expect(responses.every((response) => [200, 409].includes(response.status()))).toBeTruthy();
    const manager = await browser.newContext({ storageState: 'playwright/.auth/inventory.json' });
    const managerProducts = await manager.request.get('/api/products?available=true');
    const managerReservation = await manager.request.post('/api/reservations', { data: { variantId: (await managerProducts.json())[0].id, quantity: 1, expiresAt: new Date(Date.now() + 86400000).toISOString(), notes: 'DEV-06 manager' } });
    expect(managerReservation.status()).toBe(201);
    expect((await manager.request.post(`/api/reservations/${(await managerReservation.json()).id}/release`, { data: { confirmation: true } })).status()).toBe(200);
    await manager.close();
  });

  test('renders responsive management UI and controls permissions', async ({ page, browser }) => {
    await page.goto('/apartados');
    await expect(page.getByRole('heading', { name: 'Apartados' })).toBeVisible();
    const newReservation = page.getByRole('button', { name: 'Nuevo apartado' });
    await expect(newReservation).toBeVisible();
    await newReservation.click();
    await expect(page.getByRole('dialog', { name: 'Nuevo apartado' })).toBeVisible();
    await page.getByLabel('Buscar producto para apartado').fill(sku);
    const firstSuggestedSku = await page.locator('.reservation-catalog-results > div').first().innerText();
    await page.getByRole('button', { name: /Agregar/ }).click();
    await expect(page.getByText('1 piezas seleccionadas')).toBeVisible();
    await expect(page.locator('.reservation-catalog-results')).not.toContainText(firstSuggestedSku.split('SKU: ')[1]?.split(' · ')[0] ?? sku);
    await page.getByRole('button', { name: 'Con anticipo' }).click();
    await expect(page.getByLabel(/Monto del anticipo/)).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar crear apartado' }).click();
    const variant = (await (await page.request.get('/api/products?available=true&q=DEV-TEST-01-NORMAL')).json())[0];
    await page.request.post('/api/reservations', { data: { variantId: variant.id, quantity: 1, expiresAt: new Date(Date.now() + 86400000).toISOString(), notes: 'DEV-06 UI action' } });
    await page.reload();
    const release = page.getByRole('button', { name: 'Liberar' }).first();
    await release.click();
    await expect(page.getByRole('dialog', { name: '¿Liberar apartado?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar acción de apartado' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Liberar apartado' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Cerrar acción de apartado' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(release).toBeFocused();
    await release.click();
    await page.getByRole('button', { name: 'Liberar apartado' }).click();
    for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } })) { await page.setViewportSize(viewport); await expect(page.getByRole('heading', { name: /Apartados/ })).toBeVisible(); expect(await page.locator('.reservations-page').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy(); await page.screenshot({ path: test.info().outputPath(`reservations-${name}.png`), fullPage: false }); }
    const seller = await browser.newContext({ storageState: 'playwright/.auth/seller.json' });
    const sellerPage = await seller.newPage();
    await sellerPage.goto('/apartados');
    await expect(sellerPage.getByRole('heading', { name: /Apartados/ })).toBeVisible();
    await expect(sellerPage.getByRole('button', { name: 'Nuevo apartado' })).toHaveCount(0);
    const sellerApi = await seller.request.get('/api/reservations');
    expect(sellerApi.status()).toBe(200);
    const products = await seller.request.get('/api/products?available=true');
    expect((await seller.request.post('/api/reservations', { data: { variantId: (await products.json())[0].id, quantity: 1, expiresAt: new Date(Date.now() + 86400000).toISOString() } })).status()).toBe(403);
    await seller.close();
  });

  test('denies anonymous access and keeps Norte isolated', async ({ browser }) => {
    const anonymous = await playwrightRequest.newContext({ baseURL: 'http://127.0.0.1:3106', storageState: { cookies: [], origins: [] } });
    expect((await anonymous.get('/api/reservations')).status()).toBe(401); await anonymous.dispose();
    const norte = await browser.newContext({ storageState: 'playwright/.auth/admin-norte.json' });
    const rows = await norte.request.get('/api/reservations'); expect(rows.status()).toBe(200); expect((await rows.json()).every((row: { variant: { sku: string } }) => row.variant.sku !== sku)).toBeTruthy(); await norte.close();
  });
});
