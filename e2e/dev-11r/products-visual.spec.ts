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
    await form.getByRole('button', { name: /^Agregar/ }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `docs/ui-redesign/dev-11r-visual-evidence/products-variants-corrected-${name}.png`, fullPage: true });
    await form.getByRole('button', { name: 'Cancelar' }).click();
  }
});
