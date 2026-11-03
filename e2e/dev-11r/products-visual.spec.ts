import { expect, test } from '@playwright/test';

const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;

test('captures corrected dedicated product creation surfaces', async ({ page }) => {
  await page.goto('/productos');
  await expect(page.getByRole('heading', { name: 'Catálogo de productos' })).toBeVisible();
  for (const [name, viewport] of Object.entries(sizes)) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const form = page.getByRole('dialog', { name: 'Nuevo producto' });
    await expect(form.getByRole('heading', { name: 'Crear Producto' })).toBeVisible();
    await page.screenshot({ path: `docs/ui-redesign/dev-11r-visual-evidence/products-simple-corrected-${name}.png`, fullPage: true });
    await form.getByLabel('Varias opciones').check();
    await form.getByRole('button', { name: 'Agregar variante' }).click();
    await page.screenshot({ path: `docs/ui-redesign/dev-11r-visual-evidence/products-variants-corrected-${name}.png`, fullPage: true });
    await form.getByRole('button', { name: 'Cerrar nuevo producto' }).click();
  }
});
