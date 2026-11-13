import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';
import { requireE2eDatabaseUrl } from '../../scripts/e2e/database';

const databaseUrl = requireE2eDatabaseUrl();
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
test.afterAll(async () => prisma.$disconnect());

test('product API filters and orders isolated >page-size fixtures without unbounded rows', async ({ browser, baseURL }) => {
  const prefix = `DEVSEC-PAGE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const context = await browser.newContext({ storageState: 'playwright/.auth/admin-centro.json' });
  const productIds: string[] = [];
  try {
    const businessResponse = await context.request.get(`${baseURL}/api/businesses`);
    expect(businessResponse.ok()).toBeTruthy();
    const { activeBusinessId } = await businessResponse.json();
    const category = await prisma.category.findFirst({ where: { businessId: activeBusinessId, active: true } });
    expect(category).not.toBeNull();
    const productData = Array.from({ length: 60 }, (_, index) => {
      const id = `${prefix}-p-${index}`;
      productIds.push(id);
      return { id, businessId: activeBusinessId, name: `${prefix} Product ${String(index).padStart(3, '0')}`, photoPath: null, categoryId: category!.id, location: 'Pagination Fixture', archived: false };
    });
    for (let offset = 0; offset < productData.length; offset += 30) await prisma.product.createMany({ data: productData.slice(offset, offset + 30) });
    const variants = productData.flatMap((product, index) => Array.from({ length: index < 20 ? 2 : 1 }, (_, variantIndex) => ({
      id: `${product.id}-v-${variantIndex}`, businessId: activeBusinessId, productId: product.id,
      sku: `${prefix}-${index}-${variantIndex}`, barcode: null, cost: 10, price: 20 + index, stock: index % 10 === 0 ? 0 : index % 4 === 0 ? 2 : 20,
      lowStockThreshold: 3, active: true,
    })));
    for (let offset = 0; offset < variants.length; offset += 50) await prisma.productVariant.createMany({ data: variants.slice(offset, offset + 50) });

    async function fetchProducts(params: Record<string, string>) {
      const query = new URLSearchParams(params);
      const started = performance.now();
      const response = await context.request.get(`${baseURL}/api/products?${query}`);
      const elapsed = performance.now() - started;
      expect(response.ok()).toBeTruthy();
      expect(elapsed, 'paginated product API local response target: under 1000ms').toBeLessThan(1000);
      const body = await response.json();
      const variantCount = body.items.reduce((sum: number, row: { variants: unknown[] }) => sum + row.variants.length, 0);
      expect(body.items.length).toBeLessThanOrEqual(Number(params.limit));
      expect(variantCount).toBeLessThanOrEqual(Number(params.limit) * 2);
      console.info(`product pagination ${params.q ?? params.status ?? params.type ?? 'all'}: ${elapsed.toFixed(1)}ms; products=${body.items.length}; variants=${variantCount}`);
      return body;
    }
    const first = await fetchProducts({ q: prefix, page: '1', limit: '12' });
    expect(first).toMatchObject({ page: 1, limit: 12, total: 60, hasMore: true });
    const later = await fetchProducts({ q: prefix, page: '2', limit: '12' });
    expect(later).toMatchObject({ page: 2, total: 60, hasMore: true });
    expect(new Set([...first.items, ...later.items].map((row: { id: string }) => row.id)).size).toBe(24);
    expect(first.items.every((row: { id: string; variants: Array<{ productId: string }> }) => row.variants.every((variant) => variant.productId === row.id))).toBeTruthy();
    const categoryPage = await fetchProducts({ q: prefix, categoryId: category!.id, page: '1', limit: '48' });
    expect(categoryPage.total).toBe(60);
    expect((await fetchProducts({ q: prefix, status: 'out', page: '1', limit: '48' })).total).toBe(6);
    expect((await fetchProducts({ q: prefix, status: 'low', page: '1', limit: '48' })).total).toBe(12);
    expect((await fetchProducts({ q: prefix, type: 'multiple', page: '1', limit: '48' })).total).toBe(20);
    expect((await fetchProducts({ q: prefix, type: 'single', page: '1', limit: '48' })).total).toBe(40);
    const sorted = await fetchProducts({ q: prefix, sort: 'price-high', page: '1', limit: '12' });
    expect(sorted.items[0].name).toContain('059');

    const ui = await context.newPage();
    await ui.goto(`${baseURL}/productos`);
    const catalog = ui.getByRole('region', { name: 'Filtros de productos' });
    await catalog.getByLabel('Buscar productos').fill(prefix);
    const cards = ui.locator('.products-master-card');
    await expect(cards).toHaveCount(12);
    const firstPage = await cards.allTextContents();
    await ui.getByRole('navigation', { name: 'Paginación del catálogo' }).getByRole('button', { name: /Siguiente/ }).click();
    await expect(cards).toHaveCount(12);
    expect(await cards.allTextContents()).not.toEqual(firstPage);

    await ui.goto(`${baseURL}/pos`);
    await ui.getByRole('textbox', { name: 'Buscar productos', exact: true }).fill(prefix);
    const posCards = ui.locator('.pos-product-card');
    await expect(posCards).toHaveCount(24);
    const firstPosPage = await posCards.allTextContents();
    await ui.getByRole('navigation', { name: 'Paginación del catálogo POS' }).getByRole('button', { name: /Siguiente/ }).click();
    await expect(posCards).toHaveCount(24);
    expect(await posCards.allTextContents()).not.toEqual(firstPosPage);

    await ui.goto(`${baseURL}/apartados`);
    await ui.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/products' && url.searchParams.get('available') === 'true' && !url.searchParams.has('q');
    });
    await ui.getByRole('button', { name: 'Nuevo apartado' }).click();
    const reservationDialog = ui.getByRole('dialog', { name: 'Nuevo apartado' });
    await ui.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/products' && url.searchParams.get('available') === 'true' && !url.searchParams.has('q');
    });
    const reservationSearch = reservationDialog.getByLabel('Buscar producto para apartado');
    const resultsResponse = ui.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/products' && url.searchParams.get('available') === 'true' && url.searchParams.get('q') === prefix;
    });
    await reservationSearch.fill(prefix);
    await resultsResponse;
    const reservationResults = reservationDialog.locator('.reservation-catalog-results');
    await expect(reservationResults).toContainText('Product 001');
    await reservationSearch.press('PageDown');
    await expect(reservationResults).toContainText('Product 054');
    await reservationDialog.getByRole('button', { name: 'Cerrar crear apartado' }).click();
    await ui.close();
  } finally {
    if (productIds.length) await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await context.close();
  }
});
