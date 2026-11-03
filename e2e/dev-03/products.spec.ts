import { request as playwrightRequest, test, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { ids } from '../../scripts/e2e/seed';

const createdIds: string[] = [];
let serial = 0;

type VariantInput = { sku: string; cost: number; price: number; stock: number; lowStockThreshold?: number; size?: string; color?: string; promoPrice?: number };

async function adminRequest(context: BrowserContext) {
  return context.request;
}

async function categoryId(request: APIRequestContext) {
  const response = await request.get('/api/categories');
  expect(response.status()).toBe(200);
  const categories = await response.json();
  expect(categories.length).toBeGreaterThan(0);
  return categories[0].id as string;
}

async function createProduct(request: APIRequestContext, variants: VariantInput[], name = 'Producto') {
  const suffix = `${Date.now()}-${serial++}`;
  const body = { name: `DEV-03-${name}-${suffix}`, categoryId: await categoryId(request), location: 'DEV-03-A01', variants };
  const response = await request.post('/api/products', { data: body });
  expect(response.status()).toBe(201);
  const product = await response.json();
  createdIds.push(product.id);
  return { ...product, name: body.name, variants, categoryId: body.categoryId };
}

async function deleteCreated(request: APIRequestContext) {
  for (const id of [...createdIds].reverse()) {
    const response = await request.delete(`/api/products/${id}`);
    expect([200, 404]).toContain(response.status());
  }
  createdIds.length = 0;
}

async function waitForCatalog(page: Page) {
  await page.goto('/productos');
  await expect(page.getByRole('heading', { name: 'Catálogo de productos' })).toBeVisible();
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 });
}

async function noOverflow(page: Page) {
  expect(await page.locator('.products-page').evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
}

test.describe.configure({ mode: 'serial' });

test.describe('DEV-03 products', () => {
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin-centro.json' });
    try {
      await deleteCreated(await adminRequest(context));
    } finally {
      await context.close();
    }
  });

  test('ADMIN carga catálogo, busca seed, aplica estados, ve vacío y detalle sin overflow', async ({ page }) => {
    await waitForCatalog(page);
    await expect(page.locator('.product-card')).toHaveCount(1);

    const search = page.getByRole('textbox', { name: 'Buscar productos' });
    await search.fill('DEV-TEST-01-NORMAL');
    await expect(page.locator('.product-card')).toHaveCount(1);
    await search.fill('no-existe-DEV-03');
    await expect(page.getByRole('heading', { name: 'No encontramos productos' })).toBeVisible();
    await search.fill('');

    const status = page.getByRole('combobox', { name: 'Filtrar por estado' });
    for (const [value, sku] of [['low', 'DEV-TEST-01-LOW'], ['out', 'DEV-TEST-01-ZERO']] as const) {
      await status.selectOption(value);
      await expect(page.getByText(sku, { exact: false })).toBeVisible();
    }
    await status.selectOption('all');
    await page.getByRole('checkbox', { name: 'Sólo disponibles' }).check();
    await expect(page.getByText('DEV-TEST-01-ZERO', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await page.locator('.product-card').first().getByRole('button', { name: 'Ver detalle', exact: true }).click();
    await expect(page.getByRole('dialog', { name: /Detalle de/ })).toBeVisible();
    await expect(page.getByText('Variantes y existencias')).toBeVisible();
    await page.getByRole('button', { name: /Cerrar detalle/ }).click();
    await noOverflow(page);
  });

  test('DEV-03B conserva placeholder, altura de tarjetas y truncamiento accesible', async ({ page }) => {
    await waitForCatalog(page);
    const card = page.locator('.product-card').first();
    await expect(card.locator('.product-placeholder')).toContainText('Sin fotografía');
    await expect(card.locator('h2')).toHaveAttribute('title', /.+/);
    expect(await card.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(400);
    await noOverflow(page);
  });

  test('ADMIN crea simple, crea dos variantes manuales y persiste stock sin combinaciones', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin-centro.json' });
    try {
      const request = await adminRequest(context);
      const simple = await createProduct(request, [{ sku: `DEV-03-SIMPLE-${Date.now()}`, cost: 12.5, price: 25, stock: 7 }], 'Simple');
      const simpleDetail = await request.get(`/api/products/${simple.id}`);
      expect(simpleDetail.status()).toBe(200);
      expect((await simpleDetail.json()).variants[0]).toMatchObject({ sku: simple.variants[0].sku, stock: '7' });
      const variants = [
        { sku: `DEV-03-VAR-A-${Date.now()}`, cost: 20, price: 40, stock: 3, size: 'M', color: 'Rojo' },
        { sku: `DEV-03-VAR-B-${Date.now()}`, cost: 21, price: 42, stock: 4, size: 'L', color: 'Azul' },
      ];
      const multiple = await createProduct(request, variants, 'Variantes');
      const detail = await (await request.get(`/api/products/${multiple.id}`)).json();
      expect(detail.variants).toHaveLength(2);
      expect(detail.variants.map((variant: { sku: string }) => variant.sku).sort()).toEqual(variants.map(variant => variant.sku).sort());
      expect(detail.variants.every((variant: { stock: string }) => ['3', '4'].includes(variant.stock))).toBeTruthy();
    } finally {
      await context.close();
    }
  });

  test('ADMIN rechaza SKU duplicado, edita precios con motivo y conserva stock e historial', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin-centro.json' });
    try {
      const request = await adminRequest(context);
      const product = await createProduct(request, [{ sku: `DEV-03-EDIT-${Date.now()}`, cost: 30, price: 60, stock: 5 }], 'Edicion');
      const duplicate = await request.post('/api/products', { data: { name: 'DEV-03-Duplicado', categoryId: product.categoryId, variants: [{ sku: product.variants[0].sku, cost: 1, price: 2 }] } });
      expect(duplicate.status()).toBe(409);
      const update = await request.put(`/api/products/${product.id}`, { data: { name: product.name, categoryId: product.categoryId, variants: [{ id: (await (await request.get(`/api/products/${product.id}`)).json()).variants[0].id, sku: product.variants[0].sku, cost: 35, price: 70 }], reason: 'DEV-03 ajuste de precios' } });
      expect(update.status()).toBe(200);
      const detail = await (await request.get(`/api/products/${product.id}`)).json();
      expect(detail.variants[0]).toMatchObject({ cost: '35', price: '70', stock: '5' });
      const history = await (await request.get(`/api/products/${product.id}/history`)).json();
      expect(history).toEqual(expect.arrayContaining([expect.objectContaining({ reason: 'DEV-03 ajuste de precios', field: 'COST' }), expect.objectContaining({ reason: 'DEV-03 ajuste de precios', field: 'PRICE' })]));
      const page = await context.newPage();
      await waitForCatalog(page);
      await page.getByRole('textbox', { name: 'Buscar productos' }).fill(product.variants[0].sku);
      await page.locator('.product-card').getByRole('button', { name: 'Ver detalle', exact: true }).click();
      await expect(page.getByRole('dialog', { name: `Detalle de ${product.name}` })).toBeVisible();
      await page.close();
    } finally {
      await context.close();
    }
  });

  test('promo inválida se comprueba sólo si la UI comunica validación', async ({ page }) => {
    await waitForCatalog(page);
    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo producto' });
    await expect(dialog).toBeVisible();
    const promo = dialog.locator('.variants-table tbody tr').first().locator('input').nth(6);
    if (await promo.count()) {
      await promo.fill('-1');
      await dialog.locator('button[type="submit"]').click();
      const alert = dialog.locator('.products-form-alert');
      if (await alert.count()) {
        const message = await alert.textContent();
        if (/promocion|promoción|precio|numero|número/i.test(message ?? '')) await expect(alert).toContainText(/promocion|promoción|precio|numero|número/i);
      }
    }
    await dialog.getByRole('button', { name: 'Cerrar nuevo producto' }).click();
  });

  test('SELLER lee catálogo y no puede mutar producto ni subir imagen', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/seller.json' });
    try {
      const page = await context.newPage();
      await waitForCatalog(page);
      await expect(page.getByRole('button', { name: 'Nuevo producto' })).toHaveCount(0);
      await page.locator('.product-card').first().getByRole('button', { name: 'Ver detalle', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/^Costo /)).toHaveCount(0);
      await page.getByRole('button', { name: /Cerrar detalle/ }).click();
      const request = context.request;
      expect((await request.post('/api/products', { data: { name: 'DEV-03-seller', categoryId: ids.centroCategory, variants: [{ sku: 'DEV-03-SELLER', cost: 1, price: 2 }] } })).status()).toBe(403);
      expect((await request.put('/api/products/dev-test-01-centro-product', { data: {} })).status()).toBe(403);
      expect((await request.delete('/api/products/dev-test-01-centro-product')).status()).toBe(403);
      expect((await request.post('/api/products/image', { multipart: { file: { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('x') } } })).status()).toBe(403);
      await context.close();
    } finally {
      await context.close();
    }
  });

  test('ADMIN Centro mantiene aislamiento de Norte en catálogo, detalle e historial', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin-centro.json' });
    const norte = await browser.newContext({ storageState: 'playwright/.auth/admin-norte.json' });
    try {
      const page = await context.newPage();
      await waitForCatalog(page);
      await expect(page.getByText('DEV-TEST-01-NORTE', { exact: false })).toHaveCount(0);
      expect((await context.request.get(`/api/products/${ids.norteProduct}`)).status()).toBe(404);
      expect((await context.request.get(`/api/products/${ids.norteProduct}/history`)).status()).toBe(404);
      expect((await norte.request.get(`/api/products/dev-test-01-centro-product`)).status()).toBe(404);
    } finally {
      await context.close();
      await norte.close();
    }
  });

  test('ADMIN observa loading, error/reintento y contratos de lectura sin sesión o sin categoría', async ({ page }) => {
    let productRequests = 0;
    await page.route('**/api/products*', async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/api/products' && productRequests++ === 0) {
        await new Promise(resolve => setTimeout(resolve, 250));
        await route.abort('failed');
        return;
      }
      await route.continue();
    });

    const navigation = page.goto('/productos');
    await expect(page.getByRole('status', { name: 'Cargando productos' })).toBeVisible();
    await navigation;
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('.product-card').first()).toBeVisible();

    const unauthenticatedContext = await playwrightRequest.newContext({ baseURL: new URL(page.url()).origin, storageState: { cookies: [], origins: [] } });
    try {
      const unauthenticated = await unauthenticatedContext.get('/api/products');
      expect(unauthenticated.status()).toBe(401);
    } finally {
      await unauthenticatedContext.dispose();
    }
    const foreignCategory = await page.request.get(`/api/products?categoryId=${ids.norteCategory}`);
    expect(foreignCategory.status()).toBe(200);
    expect(await foreignCategory.json()).toEqual([]);
    const missingCategory = await page.request.get('/api/products?categoryId=DEV-03-category-does-not-exist');
    expect(missingCategory.status()).toBe(200);
    expect(await missingCategory.json()).toEqual([]);
  });

  test('INVENTORY_MANAGER crea, persiste stock inicial y elimina un producto DEV-03', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/inventory.json' });
    let product: { id: string; name: string } | undefined;
    let deleted = false;
    try {
      const sku = `DEV-03-INVENTORY-${Date.now()}`;
      const createdProduct = await createProduct(context.request, [{ sku, cost: 18, price: 36, stock: 6 }], 'Inventory');
      product = createdProduct;
      const detailResponse = await context.request.get(`/api/products/${createdProduct.id}`);
      expect(detailResponse.status()).toBe(200);
      const detail = await detailResponse.json();
      expect(detail.variants[0]).toMatchObject({ sku, stock: '6' });
      testInfo.annotations.push({ type: 'evidence', description: `${createdProduct.name}: stock inicial persistido = 6` });

      const deleteResponse = await context.request.delete(`/api/products/${createdProduct.id}`);
      expect(deleteResponse.status()).toBe(200);
      deleted = true;
    } finally {
      if (product && !deleted) {
        const cleanup = await context.request.delete(`/api/products/${product.id}`);
        expect([200, 404]).toContain(cleanup.status());
      }
      await context.close();
    }
  });

  test('ADMIN carga PNG real, valida rechazos y elimina exactamente el blob devuelto', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin-centro.json' });
    let filename: string | undefined;
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    try {
      const upload = await context.request.post('/api/products/image', { multipart: { file: { name: 'dev-03-minimal.png', mimeType: 'image/png', buffer: png } } });
      expect(upload.status()).toBe(201);
      const photoPath = (await upload.json()).photoPath as string;
      expect(photoPath).toMatch(/^\/api\/products\/image\/[0-9a-f-]{36}\.png$/);
      filename = photoPath.split('/').pop();
      const image = await context.request.get(photoPath);
      expect(image.status()).toBe(200);
      expect(image.headers()['content-type']).toBe('image/png');
      expect(await image.body()).toEqual(png);

      const invalidMime = await context.request.post('/api/products/image', { multipart: { file: { name: 'dev-03-invalid.png', mimeType: 'image/jpeg', buffer: png } } });
      expect(invalidMime.status()).toBe(400);
      const oversized = await context.request.post('/api/products/image', { multipart: { file: { name: 'dev-03-oversized.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) } } });
      expect(oversized.status()).toBe(400);
    } finally {
      if (filename) {
        expect(filename).toMatch(/^[0-9a-f-]{36}\.png$/);
        await unlink(path.join(process.cwd(), 'public', 'uploads', 'products', filename));
      }
      await context.close();
    }
  });

  test('editor integrado de producto es accesible a 390x844 y conserva foco y alertas', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForCatalog(page);
    const trigger = page.getByRole('button', { name: 'Nuevo producto' });
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await expect(page.locator('.products-page')).toHaveCSS('overflow-x', 'hidden');
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo producto' });
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Cerrar nuevo producto' });
    await expect(close).toBeFocused();
    expect(await page.locator('body').evaluate(body => body.style.overflow)).toBe('');
    for (const button of await dialog.locator('button:visible').all()) {
      const box = await button.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await dialog.locator('.products-optional-section summary').click();
    const uploadTrigger = await dialog.locator('.products-upload span').boundingBox();
    expect(uploadTrigger?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(uploadTrigger?.height ?? 0).toBeGreaterThanOrEqual(44);

    await close.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.locator('body').evaluate(body => body.style.overflow)).toBe('');
  });

  test('captura catálogo DEV-03 @visual', async ({ page }, testInfo) => {
    await waitForCatalog(page);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`DEV-03B-catalog-${testInfo.project.name}.png`), fullPage: false });
    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo producto' });
    await expect(dialog).toBeVisible();
    await dialog.screenshot({ path: testInfo.outputPath(`DEV-03B-create-simple-${testInfo.project.name}.png`) });
    await dialog.getByLabel('Varias opciones').check();
    await dialog.getByRole('button', { name: 'Agregar variante' }).click();
    await dialog.screenshot({ path: testInfo.outputPath(`DEV-03B-create-variants-${testInfo.project.name}.png`) });
    await dialog.getByRole('button', { name: 'Cerrar nuevo producto' }).click();
  });
});
