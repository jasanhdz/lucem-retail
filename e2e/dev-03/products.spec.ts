import { request as playwrightRequest, test, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { ids } from '../../scripts/e2e/seed';
import { requireE2eDatabaseUrl } from '../../scripts/e2e/database';

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
  const overflow = await page.locator('.products-page').evaluate(element => ({ width: element.scrollWidth, client: element.clientWidth, elements: [...element.querySelectorAll<HTMLElement>('*')].filter(child => child.scrollWidth > child.clientWidth + 1 && !child.classList.contains('sr-only')).slice(0, 20).map(child => ({ tag: child.tagName, className: String(child.className), scrollWidth: child.scrollWidth, clientWidth: child.clientWidth })) }));
  expect(overflow.width <= overflow.client, `Products has horizontal overflow: ${JSON.stringify(overflow)}`).toBeTruthy();
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

  test('FIX-01 preserves parametrized catalog filters, ordering, paging and tenant isolation @fix-01-catalog-query', async ({ browser }) => {
    const centro = await browser.newContext({ storageState: 'playwright/.auth/admin-centro.json' });
    const norte = await browser.newContext({ storageState: 'playwright/.auth/admin-norte.json' });
    const catalog = (params: Record<string, string>) => `/api/products?${new URLSearchParams(params)}`;
    try {
      const request = centro.request;
      const initial = await request.get(catalog({ page: '1', limit: '48' }));
      expect(initial.status()).toBe(200);
      expect(await initial.json()).toMatchObject({ page: 1, limit: 48, total: 1, hasMore: false });

      const byName = await request.get(catalog({ q: 'DEV-TEST-01 Centro Catalog', page: '1', limit: '48' }));
      expect(byName.status()).toBe(200);
      expect((await byName.json()).items.map((item: { product: { name: string } }) => item.product.name)).toEqual(['DEV-TEST-01 Centro Catalog', 'DEV-TEST-01 Centro Catalog', 'DEV-TEST-01 Centro Catalog']);
      const bySku = await request.get(catalog({ q: 'DEV-TEST-01-NORMAL', page: '1', limit: '48' }));
      expect(bySku.status()).toBe(200);
      expect((await bySku.json()).items.map((item: { sku: string }) => item.sku)).toEqual(['DEV-TEST-01-NORMAL']);
      const emptySearch = await request.get(catalog({ q: 'FIX-01-no-matching-catalog-entry', page: '1', limit: '48' }));
      expect(emptySearch.status()).toBe(200);
      expect((await emptySearch.json()).items).toEqual([]);

      const category = await request.get(catalog({ categoryId: ids.centroCategory, page: '1', limit: '48' }));
      expect(category.status()).toBe(200);
      expect(await category.json()).toMatchObject({ total: 1, summary: { skuCount: 3, available: 2, low: 1, out: 1, multiple: 1, single: 0 } });
      const foreignCategory = await request.get(catalog({ categoryId: ids.norteCategory, page: '1', limit: '48' }));
      expect(foreignCategory.status()).toBe(200);
      expect((await foreignCategory.json()).items).toEqual([]);

      const inventoryFilters: Array<Record<string, string>> = [{ status: 'low' }, { status: 'out' }, { available: 'true' }];
      for (const params of inventoryFilters) {
        const response = await request.get(catalog({ ...params, page: '1', limit: '48' }));
        expect(response.status()).toBe(200);
      }
      const low = await request.get(catalog({ status: 'low' }));
      expect((await low.json()).map((item: { sku: string }) => item.sku)).toContain('DEV-TEST-01-LOW');
      const out = await request.get(catalog({ status: 'out' }));
      expect((await out.json()).map((item: { sku: string }) => item.sku)).toContain('DEV-TEST-01-ZERO');
      const available = await request.get(catalog({ available: 'true', page: '1', limit: '48' }));
      expect(await available.json()).toMatchObject({ total: 1, availableTotal: 1, categoryCounts: { [ids.centroCategory]: 1 } });

      for (const sort of ['name', 'recent', 'price-high', 'price-low', 'stock-high', 'stock-low']) {
        const response = await request.get(catalog({ sort, page: '1', limit: '1' }));
        expect(response.status(), `sort=${sort}`).toBe(200);
        expect(await response.json()).toMatchObject({ page: 1, limit: 1, total: 1, hasMore: false });
      }
      const nextPage = await request.get(catalog({ page: '2', limit: '1' }));
      expect(nextPage.status()).toBe(200);
      expect(await nextPage.json()).toMatchObject({ page: 2, total: 1, hasMore: false, items: [] });

      const safelyParameterized = await request.get(catalog({ q: "' OR 1=1 --", page: '1', limit: '48' }));
      expect(safelyParameterized.status()).toBe(200);
      expect((await safelyParameterized.json()).items).toEqual([]);

      const crossBusiness = await request.get(catalog({ q: 'DEV-TEST-01-NORTE', page: '1', limit: '48' }));
      expect(crossBusiness.status()).toBe(200);
      expect((await crossBusiness.json()).items).toEqual([]);
      const sameBusiness = await norte.request.get(catalog({ q: 'DEV-TEST-01-NORTE', page: '1', limit: '48' }));
      expect(sameBusiness.status()).toBe(200);
      expect((await sameBusiness.json()).items.map((item: { sku: string }) => item.sku)).toEqual(['DEV-TEST-01-NORTE']);
    } finally {
      await centro.close();
      await norte.close();
    }
  });

  test('sorts products by Decimal variant prices before paging and preserves the sequence in API and catalog UI', async ({ browser, page }) => {
    const prefix = `FIX02-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdStart = createdIds.length;
    const north = await browser.newContext({ storageState: 'playwright/.auth/admin-norte.json' });
    const db = new PrismaClient({ datasources: { db: { url: requireE2eDatabaseUrl() } } });
    let noVariantId: string | undefined;
    let northProductId: string | undefined;
    try {
      const category = await categoryId(page.request);
      const make = (alias: string, variants: VariantInput[]) => createProduct(page.request, variants, `${prefix}-${alias}`);
      const [range, high, tieC, tieD, lowE, lowF, archived] = await Promise.all([
        make('A-Range', [
          { sku: `${prefix}-A-01`, cost: 1, price: 9.99, stock: 10 },
          { sku: `${prefix}-A-02`, cost: 1, price: 80, stock: 10 },
        ]),
        make('B-High', [{ sku: `${prefix}-B-01`, cost: 1, price: 100, stock: 10 }]),
        make('C-Tie', [{ sku: `${prefix}-C-01`, cost: 1, price: 50, stock: 10 }]),
        make('D-Tie', [{ sku: `${prefix}-D-01`, cost: 1, price: 50, stock: 10 }]),
        make('E-Low', [{ sku: `${prefix}-E-01`, cost: 1, price: 10, stock: 10 }]),
        make('F-Low', [{ sku: `${prefix}-F-01`, cost: 1, price: 10, stock: 10 }]),
        make('Z-Archived', [{ sku: `${prefix}-Z-01`, cost: 1, price: 200, stock: 10 }]),
      ]);
      const identicalName = `DEV-03-${prefix}-G-Identical`;
      const identicalResponses = await Promise.all([1, 2].map((index) => page.request.post('/api/products', { data: {
        name: identicalName, categoryId: category, location: 'FIX-02',
        variants: [{ sku: `${prefix}-G-0${index}`, cost: 1, price: 50, stock: 10 }],
      } })));
      for (const response of identicalResponses) expect(response.status()).toBe(201);
      const identical = await Promise.all(identicalResponses.map(async (response) => response.json() as Promise<{ id: string }>));
      createdIds.push(...identical.map((product) => product.id));
      const identicalOrder = identical.map((product) => product.id).sort();
      const archive = await page.request.delete(`/api/products/${archived.id}`);
      expect(archive.status()).toBe(200);

      noVariantId = `dev-03-fix02-no-variants-${Date.now()}`;
      await db.product.create({ data: { id: noVariantId, businessId: ids.centro, name: `DEV-03-${prefix}-No variants`, categoryId: category, location: 'FIX-02' } });

      const northCategories = await north.request.get('/api/categories');
      expect(northCategories.ok()).toBeTruthy();
      const northCategoryId = (await northCategories.json())[0]?.id as string;
      const northCreated = await north.request.post('/api/products', { data: {
        name: `DEV-03-${prefix}-North 999`, categoryId: northCategoryId, location: 'FIX-02',
        variants: [{ sku: `${prefix}-N-01`, cost: 1, price: 999, stock: 10 }],
      } });
      expect(northCreated.status()).toBe(201);
      northProductId = ((await northCreated.json()) as { id: string }).id;

      type CatalogPage = { page: number; limit: number; total: number; hasMore: boolean; items: Array<{ productId: string; sku: string; price: string; product: { name: string } }> };
      async function fetchPage(business: APIRequestContext, sort: 'price-high' | 'price-low', pageNumber: number, query = prefix, categoryFilter: string | null = category): Promise<CatalogPage> {
        const params = new URLSearchParams({ q: query, sort, page: String(pageNumber), limit: '2' });
        if (categoryFilter) params.set('categoryId', categoryFilter);
        const response = await business.get(`/api/products?${params}`);
        expect(response.status()).toBe(200);
        return response.json() as Promise<CatalogPage>;
      }
      const orderedProducts = (items: CatalogPage['items']) => {
        const seen = new Set<string>();
        return items.flatMap((item) => seen.has(item.productId) ? [] : (seen.add(item.productId), [{ id: item.productId, name: item.product.name }]));
      };
      const highOrder = [high.id, range.id, tieC.id, tieD.id, ...identicalOrder, lowE.id, lowF.id];
      const lowOrder = [range.id, lowE.id, lowF.id, tieC.id, tieD.id, ...identicalOrder, high.id];

      for (const [sort, expected] of [['price-high', highOrder], ['price-low', lowOrder]] as const) {
        const actual: string[] = [];
        for (let pageNumber = 1; pageNumber <= 4; pageNumber += 1) {
          const result = await fetchPage(page.request, sort, pageNumber);
          expect(result).toMatchObject({ page: pageNumber, limit: 2, total: 8, hasMore: pageNumber < 4 });
          const pageProducts = orderedProducts(result.items);
          const pageNames = pageProducts.map((product) => product.name);
          expect(pageNames).toHaveLength(2);
          actual.push(...pageProducts.map((product) => product.id));
          for (const product of pageProducts) {
            const skuOrder = result.items.filter((item) => item.productId === product.id).map((item) => item.sku);
            expect(skuOrder).toEqual([...skuOrder].sort());
          }
        }
        expect(actual).toEqual(expected);
        expect(new Set(actual).size).toBe(8);
      }

      const filteredPage = await fetchPage(page.request, 'price-high', 1, `${prefix}-A-Range`);
      expect(filteredPage).toMatchObject({ total: 1, hasMore: false });
      expect(orderedProducts(filteredPage.items).map((product) => product.id)).toEqual([range.id]);
      const northPage = await fetchPage(north.request, 'price-high', 1, prefix, null);
      expect(northPage).toMatchObject({ total: 1, hasMore: false });
      expect(orderedProducts(northPage.items).map((product) => product.name)).toEqual([`DEV-03-${prefix}-North 999`]);

      await page.goto('/productos');
      await page.locator('.products-search input').fill(prefix);
      await page.getByLabel('Ordenar productos').selectOption('price-high');
      await expect(page.locator('.products-master-card h2')).toHaveText([high.name, range.name, tieC.name, tieD.name, identicalName, identicalName, lowE.name, lowF.name]);
    } finally {
      for (const id of createdIds.slice(createdStart).reverse()) {
        const cleanup = await page.request.delete(`/api/products/${id}`);
        expect([200, 404]).toContain(cleanup.status());
      }
      createdIds.splice(createdStart);
      if (northProductId) await north.request.delete(`/api/products/${northProductId}`);
      if (noVariantId) await db.product.deleteMany({ where: { id: noVariantId, businessId: ids.centro } });
      await north.close();
      await db.$disconnect();
    }
  });

  test('ADMIN carga catálogo, busca seed, aplica estados, ve vacío y detalle sin overflow', async ({ page }) => {
    await waitForCatalog(page);
    await expect(page.locator('.product-card')).toHaveCount(1);

    const shellSearch = page.locator('.topbar-operation-search input');
    await shellSearch.fill('DEV-TEST-01-NORMAL');
    await expect(page.locator('.product-card')).toHaveCount(1);
    await shellSearch.fill('');
    const search = page.locator('.products-search input');
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
    await status.selectOption('available');
    await expect(page.getByText('DEV-TEST-01-ZERO', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await page.locator('.product-card').first().getByRole('button', { name: 'Ver detalle', exact: true }).click();
    await expect(page.getByRole('dialog', { name: /Detalle de/ })).toBeVisible();
    await expect(page.getByText('Variantes y existencias')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Cerrar detalle/ }).click();
    await noOverflow(page);
  });

  test('DEV-03B conserva imagen de producto, composición de catálogo y truncamiento accesible', async ({ page }) => {
    await waitForCatalog(page);
    const card = page.locator('.product-card').first();
    await expect(card.locator('.product-placeholder')).toContainText('Sin fotografía');
    await expect(card.locator('h2')).toHaveAttribute('title', /.+/);
    const cardHeight = await card.evaluate(element => element.getBoundingClientRect().height);
    expect(cardHeight).toBeGreaterThan(400);
    expect(cardHeight).toBeLessThan(700);
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
      await page.locator('.products-search input').fill(product.variants[0].sku);
      await page.locator('.product-card').getByRole('button', { name: 'Ver detalle', exact: true }).click();
      await expect(page.getByRole('dialog', { name: `Detalle de ${product.name}` })).toBeVisible();
      await page.close();
    } finally {
      await context.close();
    }
  });

  test('promo superior al precio normal resalta la fila, actualiza resumen y deshabilita guardado', async ({ page }) => {
    await waitForCatalog(page);
    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    await expect(page).toHaveURL(/\/productos\/nuevo$/);
    const dialog = page.getByRole('dialog', { name: 'Nuevo producto' });
    await expect(dialog).toBeVisible();
    await dialog.locator('.variant-mode label').nth(1).click();
    await dialog.getByLabel('Nombre del producto').fill('DEV-03 promo inválida');
    await dialog.getByLabel('Categoría').selectOption({ index: 1 });
    await dialog.getByRole('button', { name: 'Agregar variante' }).click();
    const rows = dialog.locator('.variants-table tbody tr');
    const validRow = rows.nth(0);
    await validRow.getByLabel('Talla variante 1').fill('M');
    await validRow.getByLabel('Color variante 1').fill('Negro');
    await validRow.getByLabel('SKU variante 1').fill('DEV03-VALID-M-NEG');
    await validRow.getByLabel('Costo variante 1').fill('120');
    await validRow.getByLabel('Precio variante 1').fill('249');
    await validRow.getByLabel('Stock variante 1').fill('14');
    await validRow.locator('.variant-threshold-control summary').click();
    await validRow.getByLabel('Umbral variante 1').fill('10');
    const invalidRow = rows.nth(1);
    await invalidRow.getByLabel('Talla variante 2').fill('XG');
    await invalidRow.getByLabel('Color variante 2').fill('Verde Olivo');
    await invalidRow.getByLabel('SKU variante 2').fill('DEV03-INVALID-XG-VER');
    await invalidRow.getByLabel('Costo variante 2').fill('120');
    await invalidRow.getByLabel('Precio variante 2').fill('249');
    await invalidRow.getByLabel('Promoción variante 2').fill('279');
    await invalidRow.getByLabel('Stock variante 2').fill('0');
    await invalidRow.locator('.variant-threshold-control summary').click();
    await invalidRow.getByLabel('Umbral variante 2').fill('10');
    await expect(invalidRow).toHaveClass(/variant-row-invalid/);
    await expect(dialog.locator('.variant-inline-error')).toContainText('Precio promocional');
    await expect(dialog.locator('.variants-summary')).toContainText('1 variante válida');
    await expect(dialog.locator('.variants-correction-count')).toContainText('1 variante requiere corrección');
    await expect(dialog.getByRole('button', { name: 'Guardar producto con variantes' })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page).toHaveURL(/\/productos$/);
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
      expect(photoPath).toMatch(/^\/api\/products\/image\/dev-test-01-centro_[0-9a-f-]{36}\.png$/);
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
        expect(filename).toMatch(/^dev-test-01-centro_[0-9a-f-]{36}\.png$/);
        const uploadDirectory = process.env.QA_RUN === '1' ? '.qa-uploads' : 'public/uploads';
        await unlink(path.join(process.cwd(), uploadDirectory, 'products', filename));
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
    await expect(page).toHaveURL(/\/productos\/nuevo$/);
    const dialog = page.getByRole('dialog', { name: 'Nuevo producto' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Nombre del producto')).toHaveAttribute('aria-invalid', 'false');
    await expect(dialog.getByLabel('Categoría')).toHaveAttribute('aria-invalid', 'false');
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
    await dialog.getByRole('button', { name: 'Guardar producto' }).click();
    await expect(dialog.locator('.products-form-alert')).toContainText(/nombre|categoría|SKU/i);

    await close.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.locator('body').evaluate(body => body.style.overflow)).toBe('');
    await page.goto('/productos/nuevo');
    await expect(page.getByRole('dialog', { name: 'Nuevo producto' })).toBeVisible();
  });

  test('captura catálogo DEV-03 @visual', async ({ page }, testInfo) => {
    await waitForCatalog(page);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`DEV-03B-catalog-${testInfo.project.name}.png`), fullPage: false });
    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo producto' });
    await expect(dialog).toBeVisible();
    await dialog.screenshot({ path: testInfo.outputPath(`DEV-03B-create-simple-${testInfo.project.name}.png`) });
    await dialog.locator('.variant-mode label').nth(1).click();
    await dialog.getByRole('button', { name: /^Agregar/ }).click();
    await dialog.screenshot({ path: testInfo.outputPath(`DEV-03B-create-variants-${testInfo.project.name}.png`) });
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
  });
});
