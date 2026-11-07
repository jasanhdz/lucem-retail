import { expect, request as playwrightRequest, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('DEV-04 inventory', () => {
  test('ADMIN loads scoped inventory, balances, detail and search', async ({ page }) => {
    const inventory = await page.request.get('/api/inventory');
    expect(inventory.status()).toBe(200);
    const rows = await inventory.json();
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ sku: 'DEV-TEST-01-NORMAL', available: expect.any(String), reserved: expect.any(String), physical: expect.any(String) }),
    ]));
    const normal = rows.find((row: { sku: string }) => row.sku === 'DEV-TEST-01-NORMAL');
    expect(Number(normal.physical)).toBe(Number(normal.available) + Number(normal.reserved));
    await page.goto('/inventario');
    await expect(page.getByRole('heading', { name: 'Inventario' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Disponible/ }).first()).toBeVisible();
    await page.locator('.inventory-filter-top-row input').fill('DEV-TEST-01-NORMAL');
    await expect(page.getByText('DEV-TEST-01-NORMAL', { exact: false })).toBeVisible();
    const detailLink = page.getByRole('link', { name: /Ver detalle.*DEV-TEST-01-NORMAL/ });
    await detailLink.click();
      await expect(page.locator('.inventory-detail-hero h1')).toBeVisible();
    await expect(page.getByText('Existencia física', { exact: true })).toBeVisible();
  });

  test('ADMIN records entry and adjustment atomically, persists Kardex and rejects invalid values', async ({ page }) => {
    const initial = (await (await page.request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === 'DEV-TEST-01-NORMAL');
    const invalid = await page.request.post('/api/inventory/movements', { data: { variantId: initial.id, type: 'PURCHASE', quantity: '1.001', reason: 'DEV-04-invalid' } });
    expect(invalid.status()).toBe(400);
    const missingReason = await page.request.post('/api/inventory/movements', { data: { variantId: initial.id, type: 'PURCHASE', quantity: 1 } });
    expect(missingReason.status()).toBe(400);
    const entry = await page.request.post('/api/inventory/movements', { data: { variantId: initial.id, type: 'PURCHASE', quantity: 3, reason: 'DEV-04-entry' } });
    expect(entry.status()).toBe(200);
    expect((await entry.json()).movementId).toEqual(expect.any(String));
    const adjustment = await page.request.post('/api/inventory/movements', { data: { variantId: initial.id, type: 'ADJUSTMENT_OUT', quantity: 2, reason: 'DEV-04-adjustment' } });
    expect(adjustment.status()).toBe(200);
    const after = (await (await page.request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === 'DEV-TEST-01-NORMAL');
    expect(Number(after.available)).toBe(Number(initial.available) + 1);
    expect(Number(after.physical)).toBe(Number(after.available) + Number(after.reserved));
    const movements = await page.request.get('/api/inventory/movements?q=DEV-04&pageSize=100');
    expect(movements.status()).toBe(200);
    expect((await movements.json()).items.map((item: { reason: string }) => item.reason)).toEqual(expect.arrayContaining(['DEV-04-entry', 'DEV-04-adjustment']));
    for (let index = 0; index < 25; index += 1) {
      const extra = await page.request.post('/api/inventory/movements', { data: { variantId: initial.id, type: 'PURCHASE', quantity: 1, reason: `DEV-04-page-${index}` } });
      expect(extra.status()).toBe(200);
    }
    const paged = await page.request.get('/api/inventory/movements?page=2&pageSize=5');
    expect(paged.status()).toBe(200);
    expect((await paged.json()).totalPages).toBeGreaterThan(1);
    const dated = await page.request.get('/api/inventory/movements?from=2026-01-01&to=2099-12-31&pageSize=5');
    expect(dated.status()).toBe(200);
    const restore = await page.request.post('/api/inventory/movements', { data: { variantId: initial.id, type: 'ADJUSTMENT_OUT', quantity: 26, reason: 'DEV-04-restore' } });
    expect(restore.status()).toBe(200);
  });

  test('active reservation protects reserved units and release restores availability', async ({ page }) => {
    const request = page.request;
    const initial = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === 'DEV-TEST-01-NORMAL');
    const reservation = await request.post('/api/reservations', { data: { variantId: initial.id, quantity: 2, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), notes: 'DEV-04-reservation' } });
    expect(reservation.status()).toBe(201);
    const withReservation = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === 'DEV-TEST-01-NORMAL');
    expect(Number(withReservation.reserved)).toBe(Number(initial.reserved) + 2);
    expect(Number(withReservation.physical)).toBe(Number(withReservation.available) + Number(withReservation.reserved));
    const conflict = await request.post('/api/inventory/movements', { data: { variantId: initial.id, type: 'ADJUSTMENT_OUT', quantity: Number(withReservation.available) + 1, reason: 'DEV-04-reserved-conflict' } });
    expect(conflict.status()).toBe(409);
    const released = await request.post(`/api/reservations/${(await reservation.json()).id}/release`, { data: { confirmation: true } });
    expect(released.status()).toBe(200);
    const final = (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === 'DEV-TEST-01-NORMAL');
    expect(Number(final.reserved)).toBe(Number(initial.reserved));
    expect(Number(final.available)).toBe(Number(initial.available));
  });

  test('ADMIN UI prevents duplicate mutation requests and refreshes after success', async ({ page }) => {
    await page.goto('/inventario');
    const trigger = page.getByRole('button', { name: /Registrar movimiento/ });
    await trigger.click();
    await expect(page.getByRole('dialog', { name: 'Registrar entrada de stock' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByLabel('Cantidad').fill('1');
    await page.getByLabel('Referencia u observación').fill('DEV-04-ui');
    let requests = 0;
    page.on('request', (request) => { if (request.url().endsWith('/api/inventory/movements') && request.method() === 'POST') requests += 1; });
    await page.getByRole('button', { name: /Confirmar entrada/ }).dblclick();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(requests).toBe(1);
    await page.getByRole('button', { name: 'Realizar ajuste' }).click();
    await expect(page.getByRole('dialog', { name: 'Ajuste de existencias' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Disminuir stock/ })).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel('Cantidad').fill('1');
    await page.getByLabel('Detalle o justificación obligatoria').fill('DEV-04-ui-adjustment');
    await expect(page.getByText('-1 pzas')).toBeVisible();
    await page.getByRole('button', { name: /Confirmar ajuste/ }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(requests).toBe(2);
  });

  test('unauthenticated access is denied, INVENTORY_MANAGER can mutate, SELLER is read-only and ADMIN isolation excludes Norte data', async ({ browser }) => {
    const anonymous = await playwrightRequest.newContext({ baseURL: 'http://127.0.0.1:3104', storageState: { cookies: [], origins: [] } });
    expect((await anonymous.get('/api/inventory')).status()).toBe(401);
    await anonymous.dispose();
    const inventory = await browser.newContext({ storageState: 'playwright/.auth/inventory.json' });
    const inventoryRows = await (await inventory.request.get('/api/inventory')).json();
    const inventoryVariant = inventoryRows.find((row: { sku: string }) => row.sku === 'DEV-TEST-01-NORMAL');
    const managerEntry = await inventory.request.post('/api/inventory/movements', { data: { variantId: inventoryVariant.id, type: 'PURCHASE', quantity: 1, reason: 'DEV-04-manager' } });
    expect(managerEntry.status()).toBe(200);
    const managerRestore = await inventory.request.post('/api/inventory/movements', { data: { variantId: inventoryVariant.id, type: 'ADJUSTMENT_OUT', quantity: 1, reason: 'DEV-04-manager-restore' } });
    expect(managerRestore.status()).toBe(200);
    await inventory.close();
    const seller = await browser.newContext({ storageState: 'playwright/.auth/seller.json' });
    const sellerInventory = await seller.request.get('/api/inventory');
    expect(sellerInventory.status()).toBe(200);
    const sellerRows = await sellerInventory.json();
    const sellerMutation = await seller.request.post('/api/inventory/movements', { data: { variantId: sellerRows[0].id, type: 'PURCHASE', quantity: 1, reason: 'DEV-04-seller' } });
    expect(sellerMutation.status()).toBe(403);
    await seller.close();
    const norte = await browser.newContext({ storageState: 'playwright/.auth/admin-norte.json' });
    const norteRows = await (await norte.request.get('/api/inventory')).json();
    expect(norteRows.every((row: { sku: string }) => !row.sku.startsWith('DEV-TEST-01-CENTRO'))).toBeTruthy();
    await norte.close();
  });

  test('renders visual evidence for inventory, detail, movement history and mutation dialog', async ({ page }) => {
    for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } })) {
      await page.setViewportSize(viewport);
      await page.goto('/inventario');
      await expect(page.getByRole('heading', { name: 'Inventario' })).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`inventory-general-${name}.png`), fullPage: false });
      const detail = page.getByRole('link', { name: /Ver detalle/ }).first();
      const detailHref = await detail.getAttribute('href');
      await detail.click();
      await expect(page.locator('.inventory-detail-hero h1')).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`inventory-detail-${name}.png`), fullPage: false });
      await page.goto('/inventario/movimientos');
      await expect(page.getByRole('heading', { name: 'Kárdex de Movimientos' })).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`inventory-movements-${name}.png`), fullPage: false });
       await page.goto('/inventario');
       await page.getByRole('button', { name: /Registrar movimiento/ }).click();
       await expect(page.getByRole('dialog')).toBeVisible();
       await page.screenshot({ path: test.info().outputPath(`inventory-mutation-${name}.png`), fullPage: false });
       await page.getByRole('button', { name: 'Cerrar diálogo' }).click();
       await page.getByRole('button', { name: 'Realizar ajuste' }).click();
       await expect(page.getByRole('dialog', { name: 'Ajuste de existencias' })).toBeVisible();
       await page.screenshot({ path: test.info().outputPath(`inventory-adjustment-${name}.png`), fullPage: false });
       await page.getByRole('button', { name: 'Cerrar diálogo' }).click();
       expect(detailHref).toMatch(/^\/inventario\//);
    }
  });
});
