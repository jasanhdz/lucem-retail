import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { productImageDirectory } from '../../src/lib/upload-storage';
import { ids } from '../../scripts/e2e/seed';
import { assertE2eDatabaseIdentity, requireE2eDatabaseUrl } from '../../scripts/e2e/database';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';

const sizes = { desktop: { width: 1533, height: 1600 }, mobile: { width: 390, height: 1600 } } as const;
const db = new PrismaClient({ datasources: { db: { url: requireE2eDatabaseUrl() } } });

test.afterAll(async () => db.$disconnect());

test('captures corrected dedicated product creation surfaces', async ({ page }, testInfo) => {
  await page.goto('/productos');
  await expect(page.getByRole('heading', { name: 'Catálogo de productos' })).toBeVisible();
  for (const [name, viewport] of Object.entries(sizes)) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const form = page.getByRole('dialog', { name: 'Nuevo producto' });
    await expect(form.getByRole('heading', { name: 'Crear Producto' })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`products-simple-corrected-${name}.png`), fullPage: true });
    const multipleMode = form.getByRole('radio', { name: /Varias opciones/ });
    await form.getByText('Varias opciones', { exact: true }).click();
    await expect(multipleMode).toBeChecked();
    for (let row = 0; row < (name === 'desktop' ? 3 : 1); row += 1) await form.getByRole('button', { name: /^Agregar/ }).click();
    if (name === 'desktop') {
      await form.getByLabel('Nombre del producto').fill('Playera Básica Algodón');
      await form.getByLabel('Categoría').selectOption({ index: 1 });
      await form.getByLabel('Ubicación en tienda').fill('Pasillo 2, Anaquel C-01');
    }
    const variants = [
      { size: 'CH', color: 'Negro', sku: 'PLY-BAS-CH-NEG', barcode: '750102049101', cost: '120.00', price: '249.00', promo: '', stock: '14', threshold: '10' },
      { size: 'M', color: 'Negro', sku: 'PLY-BAS-M-NEG', barcode: '750102049102', cost: '120.00', price: '249.00', promo: '', stock: '18', threshold: '10' },
      { size: 'G', color: 'Blanco', sku: 'PLY-BAS-G-BLA', barcode: '750102049103', cost: '120.00', price: '249.00', promo: '', stock: '12', threshold: '10' },
      { size: 'XG', color: 'Verde Olivo', sku: 'PLY-BAS-XG-VER', barcode: '750102049104', cost: '120.00', price: '249.00', promo: '279.00', stock: '0', threshold: '10' },
    ];
    for (const [index, variant] of (name === 'desktop' ? variants : []).entries()) {
      const variantNumber = index + 1;
      const fields = name === 'desktop'
        ? form.locator('.variants-table tbody tr').nth(index)
        : form.locator('.variant-card').nth(index);
      if (name === 'mobile' && index > 0) await fields.locator('summary').click();
      await fields.getByLabel(`Talla variante ${variantNumber}`).fill(variant.size);
      await fields.getByLabel(`Color variante ${variantNumber}`).fill(variant.color);
      await fields.getByLabel(`SKU variante ${variantNumber}`).fill(variant.sku);
      await fields.getByLabel(`Barcode variante ${variantNumber}`).fill(variant.barcode);
      await fields.getByLabel(`Costo variante ${variantNumber}`).fill(variant.cost);
      await fields.getByLabel(`Precio variante ${variantNumber}`).fill(variant.price);
      if (variant.promo) await fields.getByLabel(`Promoción variante ${variantNumber}`).fill(variant.promo);
      await fields.getByLabel(`Stock variante ${variantNumber}`).fill(variant.stock);
      if (name === 'desktop') {
        await fields.locator('.variant-threshold-control summary').click();
        await fields.getByLabel(`Umbral variante ${variantNumber}`).fill(variant.threshold);
        await fields.locator('.variant-threshold-control summary').click();
      } else {
        await fields.getByLabel(`Umbral variante ${variantNumber}`).fill(variant.threshold);
      }
    }
    if (name === 'desktop') {
      await expect(form.locator('.variants-summary')).toContainText('3 variantes válidas');
      await expect(form.locator('.variants-correction-count')).toContainText('1 variante requiere corrección');
      await expect(form.getByRole('button', { name: 'Guardar producto con variantes' })).toBeDisabled();
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`products-variants-corrected-${name}.png`), fullPage: true });
    await form.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page).toHaveURL(/\/productos$/);
    await expect(page.getByRole('button', { name: 'Nuevo producto' })).toBeVisible();
  }
});

test('captures the Stitch product catalog for desktop and mobile', async ({ page }, testInfo) => {
  const prefix = `DEV11R-CATALOG-${Date.now()}`;
  const categoriesResponse = await page.request.get('/api/categories');
  expect(categoriesResponse.ok()).toBeTruthy();
  const categories = await categoriesResponse.json() as { id: string }[];
  const categoryId = categories[0]?.id;
  expect(categoryId).toBeTruthy();
  const products = [
    { name: 'Playera Básica Algodón', image: 'playera', variants: [{ sku: `${prefix}-PLY-CH`, size: 'CH', color: 'Negro', cost: 120, price: 249, stock: 14, lowStockThreshold: 5 }, { sku: `${prefix}-PLY-M`, size: 'M', color: 'Negro', cost: 120, price: 249, stock: 18, lowStockThreshold: 5 }, { sku: `${prefix}-PLY-G`, size: 'G', color: 'Blanco', cost: 120, price: 249, stock: 12, lowStockThreshold: 5 }, { sku: `${prefix}-PLY-XG`, size: 'XG', color: 'Verde', cost: 120, price: 249, stock: 0, lowStockThreshold: 5 }] },
    { name: 'Jeans Denim Regular Fit', image: 'jeans', variants: Array.from({ length: 3 }, (_, index) => ({ sku: `${prefix}-JNS-${index}`, size: ['CH', 'M', 'G'][index], color: 'Azul', cost: 300, price: 599, stock: index === 0 ? 8 : 4, lowStockThreshold: 10 })) },
    { name: 'Cuaderno Profesional Raya 100 H', image: 'cuaderno', variants: [{ sku: `${prefix}-CUA`, cost: 28.5, price: 45, stock: 45, lowStockThreshold: 15 }] },
    { name: 'Tenis Urbanos Classic', image: 'tenis', variants: Array.from({ length: 3 }, (_, index) => ({ sku: `${prefix}-TEN-${index}`, size: String(24 + index), color: 'Blanco', cost: 450, price: 899, stock: 12, lowStockThreshold: 8 })) },
    { name: 'Sudadera Oversize Capucha', variants: [{ sku: `${prefix}-SUD`, size: 'G', color: 'Verde', cost: 250, price: 450, stock: 0, lowStockThreshold: 10 }] },
    { name: 'Gorra Trucker Bordada', image: 'gorra', variants: [{ sku: `${prefix}-GOR`, color: 'Negro', cost: 80, price: 180, stock: 19, lowStockThreshold: 5 }, { sku: `${prefix}-GOR-2`, color: 'Azul', cost: 80, price: 180, stock: 8, lowStockThreshold: 5 }] },
  ];
  const createdIds: string[] = [];
  const uploadedFiles: string[] = [];
  try {
    const photos: Record<string, string> = {};
    for (const photoName of ['playera', 'jeans', 'cuaderno', 'tenis', 'gorra']) {
      const buffer = await readFile(path.join(process.cwd(), 'e2e/dev-11r/fixtures', `${photoName}.png`));
      const response = await page.request.post('/api/products/image', { multipart: { file: { name: `dev-11r-${photoName}.png`, mimeType: 'image/png', buffer } } });
      expect(response.status()).toBe(201);
      const photoPath = (await response.json()).photoPath as string;
      const filename = photoPath.split('/').pop() ?? '';
      expect(filename).toMatch(/^dev-test-01-centro_[0-9a-f-]{36}\.png$/);
      uploadedFiles.push(filename);
      photos[photoName] = photoPath;
    }
    for (const product of [...products].reverse()) {
      const { image, ...data } = product;
      const response = await page.request.post('/api/products', { data: { ...data, photoPath: image ? photos[image] : null, categoryId, location: 'Pasillo 2, Anaquel C-01' } });
      expect(response.status()).toBe(201);
      createdIds.push((await response.json()).id as string);
    }
    for (const [name, viewport] of Object.entries({ desktop: { width: 1450, height: 1600 }, mobile: { width: 394, height: 1600 } })) {
      await page.setViewportSize(viewport);
      await page.goto('/productos');
      await page.locator('.products-search input').fill(prefix);
      await expect(page.locator('.product-card')).toHaveCount(6);
      await page.locator('.products-card-image-frame img').evaluateAll((images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode().catch(() => undefined))));
      console.log(`catalog ${name} images:`, await page.locator('.products-card-image-frame img').evaluateAll((images) => images.map((image) => ({ src: (image as HTMLImageElement).getAttribute('src'), complete: (image as HTMLImageElement).complete, width: (image as HTMLImageElement).naturalWidth }))));
      await page.screenshot({ path: testInfo.outputPath(`catalog-corrected-${name}.png`), fullPage: true });
    }
  } finally {
    try {
      if (createdIds.length) {
        await assertE2eDatabaseIdentity(db);
        await db.$transaction(async (tx) => {
          const variants = await tx.productVariant.findMany({ where: { businessId: ids.centro, productId: { in: createdIds } }, select: { id: true } });
          const variantIds = variants.map((variant) => variant.id);
          await tx.auditLog.deleteMany({ where: { businessId: ids.centro, entityType: 'Product', entityId: { in: createdIds } } });
          if (variantIds.length) {
            await tx.inventoryMovement.deleteMany({ where: { businessId: ids.centro, variantId: { in: variantIds } } });
            await tx.priceCostHistory.deleteMany({ where: { businessId: ids.centro, variantId: { in: variantIds } } });
            await tx.productVariant.deleteMany({ where: { businessId: ids.centro, id: { in: variantIds } } });
          }
          await tx.product.deleteMany({ where: { businessId: ids.centro, id: { in: createdIds } } });
        });
        const remaining = await Promise.all([
          db.product.count({ where: { businessId: ids.centro, id: { in: createdIds } } }),
          db.productVariant.count({ where: { businessId: ids.centro, productId: { in: createdIds } } }),
          db.auditLog.count({ where: { businessId: ids.centro, entityType: 'Product', entityId: { in: createdIds } } }),
        ]);
        expect(remaining.every((count) => count === 0)).toBe(true);
      }
    } finally {
      for (const filename of uploadedFiles) await unlink(path.join(productImageDirectory(), filename));
    }
  }
});
