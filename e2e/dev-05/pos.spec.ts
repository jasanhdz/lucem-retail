import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function variant(page: Page, sku: string) {
  const rows = await (await page.request.get(`/api/products?q=${sku}`)).json();
  const row = rows.find((item: { sku: string }) => item.sku === sku);
  expect(row).toBeTruthy();
  return row as { id: string; stock: string; price: string; promoPrice?: string | null; product: { name: string } };
}

test.describe('DEV-05 POS', () => {
  test('loads real catalog, searches and selects an available variant', async ({ page }) => {
    const response = await page.request.get('/api/products?available=true&q=DEV-TEST-01-NORMAL');
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(expect.arrayContaining([expect.objectContaining({ sku: 'DEV-TEST-01-NORMAL' })]));
    await page.goto('/pos');
    await expect(page.getByRole('heading', { name: 'Nueva venta' })).toBeAttached();
    await expect(page.locator('.pos-variant-badge').first()).toBeVisible();
    const categories = await (await page.request.get('/api/categories')).json();
    const testCategory = categories.find((category: { id: string }) => category.id === 'dev-test-01-centro-category');
    expect(testCategory).toBeTruthy();
    await page.getByRole('button', { name: new RegExp(testCategory.name) }).click();
    await expect(page.getByRole('button', { name: /Agregar DEV-TEST-01 Centro Catalog/ })).toBeVisible();
    await page.getByRole('button', { name: /^Todos/ }).click();
    const trigger = page.getByRole('button', { name: /Agregar DEV-TEST-01 Centro Catalog/ });
    await trigger.click();
    await expect(page.getByRole('dialog', { name: 'Seleccionar variante de DEV-TEST-01 Centro Catalog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar variantes' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Aumentar cantidad' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Cerrar variantes' })).toBeFocused();
    await page.screenshot({ path: test.info().outputPath('pos-variants.png'), fullPage: false });
    await expect(page.getByRole('button', { name: /SKU DEV-TEST-01-ZERO/ })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole('button', { name: /SKU DEV-TEST-01-LOW/ }).click();
    await page.getByRole('button', { name: /Agregar al carrito/ }).click();
    await expect(page.getByText('DEV-TEST-01 Centro Catalog')).toBeVisible();
  });

  test('validates cash and preserves the cart while capturing exact POS viewports', async ({ page }) => {
    await page.goto('/pos');
    await page.getByRole('textbox', { name: 'Buscar productos' }).fill('DEV-TEST-01-LOW');
    await page.getByRole('button', { name: /Agregar DEV-TEST-01 Centro Catalog/ }).click();
    for (const button of await page.locator('.pos-stepper button').all()) {
      const box = await button.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(30);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(30);
    }
    await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
    await expect(page).toHaveURL(/\/pos\/cobro$/);
    await page.getByLabel('Monto recibido').fill('1');
    await expect(page.locator('.pos-cash-change')).toContainText('EFECTIVO INSUFICIENTE');
    await expect(page.getByText('DEV-TEST-01-LOW')).toBeVisible();
    for (const label of await page.locator('.pos-method-options button').all()) {
      const box = await label.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: /Regresar al carrito/ }).click();
    for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } })) {
      await page.setViewportSize(viewport);
      expect(await page.locator('.pos-page').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
      await page.screenshot({ path: test.info().outputPath(`pos-${name}.png`), fullPage: false });
    }
  });

  test('persists CASH sale, ticket and one stock decrement', async ({ page }) => {
    const row = await variant(page, 'DEV-TEST-01-NORMAL');
    const before = Number(row.stock);
    await page.goto('/pos');
    await page.getByRole('textbox', { name: 'Buscar productos' }).fill('DEV-TEST-01-NORMAL');
    await page.getByRole('button', { name: /Agregar DEV-TEST-01 Centro Catalog/ }).click();
    await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
    await expect(page).toHaveURL(/\/pos\/cobro$/);
    await page.getByLabel('Monto recibido').fill('150');
    await page.getByLabel('Imprimir ticket térmico').uncheck();
    await page.getByRole('button', { name: 'Confirmar venta (Enter)' }).click();
    await expect(page).toHaveURL(/\/tickets\//);
    const saleId = page.url().split('/').pop();
    const sale = await page.request.get(`/api/sales/${saleId}`);
    expect(sale.status()).toBe(200);
    const saleBody = await sale.json();
    expect(Number(saleBody.changeAmount)).toBe(50);
    expect(saleBody.lines).toHaveLength(1);
    const after = await variant(page, 'DEV-TEST-01-NORMAL');
    expect(Number(after.stock)).toBe(before - 1);
    await expect(page.getByRole('heading', { name: new RegExp(`Folio #${saleBody.folio}`) })).toBeVisible();
    await expect(page.getByText('Recibido / Cambio')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Imprimir ticket' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nueva venta' })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('pos-ticket-success.png'), fullPage: false });
  });

  test('supports CARD, TRANSFER and exact idempotent replay', async ({ page }) => {
    const normal = await variant(page, 'DEV-TEST-01-NORMAL');
    for (const [paymentMethod, key] of [['CARD', 'DEV-05-card'], ['TRANSFER', 'DEV-05-transfer']] as const) {
      const response = await page.request.post('/api/sales', { data: { items: [{ variantId: normal.id, quantity: 1 }], paymentMethod, idempotencyKey: key } });
      expect(response.status()).toBe(201);
    }
    const body = { items: [{ variantId: normal.id, quantity: 1 }], paymentMethod: 'CARD', idempotencyKey: 'DEV-05-replay' };
    const first = await page.request.post('/api/sales', { data: body });
    const second = await page.request.post('/api/sales', { data: body });
    expect(first.status()).toBe(201);
    expect(second.status()).toBe(201);
    expect((await second.json()).id).toBe((await first.json()).id);
    const changed = await page.request.post('/api/sales', { data: { ...body, paymentMethod: 'TRANSFER' } });
    expect(changed.status()).toBe(409);
  });

  test('handles concurrent stock conflict and keeps business isolation', async ({ browser, page }) => {
    const low = await variant(page, 'DEV-TEST-01-LOW');
    const [first, second] = await Promise.all([
      page.request.post('/api/sales', { data: { items: [{ variantId: low.id, quantity: 1 }], paymentMethod: 'CARD', idempotencyKey: 'DEV-05-concurrent-a' } }),
      page.request.post('/api/sales', { data: { items: [{ variantId: low.id, quantity: 1 }], paymentMethod: 'CARD', idempotencyKey: 'DEV-05-concurrent-b' } }),
    ]);
    expect([first.status(), second.status()].sort()).toEqual([201, 409]);
    await page.goto('/pos');
    await page.getByRole('textbox', { name: 'Buscar productos' }).fill('DEV-TEST-01-NORMAL');
    await page.getByRole('button', { name: /Agregar DEV-TEST-01 Centro Catalog/ }).click();
    await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
    await expect(page).toHaveURL(/\/pos\/cobro$/);
    await page.getByLabel('Monto recibido').fill('150');
    await page.getByLabel('Imprimir ticket térmico').uncheck();
    await page.route('**/api/sales', async (route) => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Existencia insuficiente' }) }));
    await page.getByRole('button', { name: 'Confirmar venta (Enter)' }).click();
    await expect(page.locator('.pos-payment-error')).toContainText('stock cambió');
    await expect(page.getByText('DEV-TEST-01-NORMAL')).toBeVisible();
    await page.unroute('**/api/sales');
    const norte = await browser.newContext({ storageState: 'playwright/.auth/admin-norte.json' });
    const products = await norte.request.get('/api/products?q=DEV-TEST-01-CENTRO');
    expect(await products.json()).toEqual([]);
    const crossTicket = await norte.request.get('/api/sales/not-a-sale-from-centro');
    expect(crossTicket.status()).toBe(404);
    await norte.close();
  });

  test('SELLER can use the existing sale contract but cannot mutate products', async ({ browser }) => {
    const seller = await browser.newContext({ storageState: 'playwright/.auth/seller.json' });
    const products = await seller.request.get('/api/products?available=true');
    expect(products.status()).toBe(200);
    const rows = await products.json();
    const product = await seller.request.post('/api/products', { data: { name: 'DEV-05 forbidden', categoryId: 'dev-test-01-centro-category', sku: 'DEV-05-FORBIDDEN', cost: 1, price: 2 } });
    expect(product.status()).toBe(403);
    expect(rows.length).toBeGreaterThan(0);
    const sellerPage = await seller.newPage();
    await sellerPage.goto('/pos');
    await sellerPage.getByRole('textbox', { name: 'Buscar productos' }).fill('DEV-TEST-01-NORMAL');
    await sellerPage.getByRole('button', { name: /Agregar DEV-TEST-01 Centro Catalog/ }).click();
    await sellerPage.getByRole('button', { name: 'Cobrar', exact: true }).click();
    await expect(sellerPage).toHaveURL(/\/pos\/cobro$/);
    await sellerPage.getByLabel('Monto recibido').fill('150');
    await sellerPage.getByLabel('Imprimir ticket térmico').uncheck();
    await sellerPage.getByRole('button', { name: 'Confirmar venta (Enter)' }).click();
    await expect(sellerPage).toHaveURL(/\/tickets\//);
    await sellerPage.close();
    await seller.close();
  });
});
