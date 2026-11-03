import { expect, test } from '@playwright/test';

const sizes = { desktop: { width: 1533, height: 1600 }, mobile: { width: 390, height: 1600 } } as const;

test('captures corrected dedicated product creation surfaces', async ({ page }) => {
  await page.goto('/productos');
  await expect(page.getByRole('heading', { name: 'Catálogo de productos' })).toBeVisible();
  for (const [name, viewport] of Object.entries(sizes)) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const form = page.getByRole('dialog', { name: 'Nuevo producto' });
    await expect(form.getByRole('heading', { name: 'Crear Producto' })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `docs/ui-redesign/dev-11r-visual-evidence/products-simple-corrected-${name}.png`, fullPage: true });
    await form.locator('.variant-mode label').nth(1).click();
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
    await page.screenshot({ path: `docs/ui-redesign/dev-11r-visual-evidence/products-variants-corrected-${name}.png`, fullPage: true });
    await form.getByRole('button', { name: 'Cancelar' }).click();
  }
});
