import { expect, test } from '@playwright/test';

async function openCatalog(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/negocios/);
  await page.getByRole('button', { name: /American Outfit/ }).first().click();
  await page.goto('/productos');
  await expect(page.getByRole('heading', { name: 'Catálogo de productos' })).toBeVisible();
}

test('catalog combines SKU, category and available filters and clears them', async ({ page }) => {
  await openCatalog(page);
  await expect(page.getByRole('status')).toBeHidden();
  const cards = page.locator('.product-card');
  await expect(cards.first()).toBeVisible();
  const availableCard = cards.filter({ hasText: 'Disponible' }).first();
  await expect(availableCard).toBeVisible();
  const skuText = await availableCard.locator('.product-sku').innerText();
  const sku = skuText.replace(/^SKU\s*/, '').split(' · ')[0];
  const category = (await availableCard.locator('.product-category').innerText()).trim();

  const filters = page.getByRole('region', { name: 'Filtros de productos' });
  await filters.getByLabel('Buscar productos').fill(sku);
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText(sku);

  await filters.getByLabel('Filtrar por categoría').selectOption({ label: category });
  await filters.getByLabel('Filtrar por estado').selectOption({ label: 'Disponible' });
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText(sku);
  await expect(cards.first().locator('.product-category')).toHaveText(category);
  await expect(cards.first()).toContainText('Disponible');

  await filters.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(cards.first()).toBeVisible();
  await expect.poll(() => cards.count()).toBeGreaterThan(1);
});

test('catalog search and accessible modal work at 390px without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCatalog(page);
  await page.getByLabel('Buscar productos').fill('AO-0001');
  await expect(page.locator('.product-card')).toContainText('AO-0001');
  await page.getByLabel('Buscar productos').fill('no-existe-xyz');
  await expect(page.getByText('No encontramos productos')).toBeVisible();
  await page.getByRole('region', { name: 'Filtros de productos' }).getByRole('button', { name: 'Limpiar filtros' }).click();

  const trigger = page.getByRole('button', { name: 'Nuevo producto' });
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo producto' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cerrar formulario' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Crear producto' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Cerrar formulario' })).toBeFocused();
  await dialog.getByLabel('Nombre del producto').fill('Borrador que persiste');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByLabel('Nombre del producto')).toHaveValue('Borrador que persiste');
  const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
  const actions = await page.locator('.catalog-dialog-actions button').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  expect(actions.every((height) => height >= 44)).toBeTruthy();
});

test('desktop catalog uses multiple card columns and detail dialog opens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCatalog(page);
  const measurements = await page.locator('.catalog-grid').evaluate((grid) => ({ columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length, width: document.documentElement.scrollWidth }));
  expect(measurements.columns).toBeGreaterThanOrEqual(3);
  expect(measurements.width).toBeLessThanOrEqual(1440);
  await page.locator('.product-card-main').first().click();
  const detail = page.locator('.detail-dialog');
  await expect(detail).toBeVisible();
  await expect.poll(() => detail.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThanOrEqual(640);
  await expect.poll(() => detail.evaluate((element) => { const rect = element.getBoundingClientRect(); return { x: Math.abs(rect.left + rect.width / 2 - innerWidth / 2), y: Math.abs(rect.top + rect.height / 2 - innerHeight / 2) }; })).toEqual({ x: 0, y: 0 });
  const detailInsets = await detail.evaluate((element) => {
    const panel = element.getBoundingClientRect();
    return [...element.querySelectorAll<HTMLElement>('.detail-body > h3')].map((section) => {
      const rect = section.getBoundingClientRect();
      return { left: rect.left - panel.left, right: panel.right - rect.right };
    });
  });
  expect(detailInsets.every(({ left, right }) => left >= 16 && right >= 16)).toBeTruthy();
  const sectionInsets = await detail.locator('.detail-variants, .detail-history').evaluateAll((sections) => sections.map((section) => {
    const style = getComputedStyle(section);
    return { left: parseFloat(style.paddingLeft), right: parseFloat(style.paddingRight) };
  }));
  expect(sectionInsets.length).toBeGreaterThanOrEqual(1);
  expect(sectionInsets.every(({ left, right }) => left >= 16 && right >= 16)).toBeTruthy();
  await expect(page.getByText('Variantes y existencias')).toBeVisible();
  await detail.getByRole('button', { name: 'Cerrar detalle' }).click();
  await page.getByRole('button', { name: 'Nuevo producto' }).click();
  const form = page.getByRole('dialog', { name: 'Nuevo producto' });
  await expect.poll(() => form.evaluate((element) => { const rect = element.getBoundingClientRect(); return { x: Math.abs(rect.left + rect.width / 2 - innerWidth / 2), y: Math.abs(rect.top + rect.height / 2 - innerHeight / 2) }; })).toEqual({ x: 0, y: 0 });
  for (const label of ['SKU', 'Código de barras', 'Talla', 'Color', 'Stock inicial', 'Costo', 'Precio normal', 'Precio promocional', 'Límite de stock bajo']) await expect(form.getByLabel(label, { exact: true })).toBeInViewport();
  await expect(form.getByText('Foto del producto')).toBeInViewport();
  await expect(form.getByRole('button', { name: 'Crear producto' })).toBeInViewport();
  expect(await form.locator('.catalog-dialog-body').evaluate((body) => body.scrollHeight <= body.clientHeight)).toBeTruthy();
});

test('mobile dialogs have one scroll region, lock the background, and sidebar stays in document flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCatalog(page);
  await page.evaluate(() => window.scrollTo(0, 300));
  const pageScroll = await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0);
  const trigger = page.getByRole('button', { name: 'Nuevo producto' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo producto' });
  await expect(dialog).toBeVisible();
  const scrollRegions = await dialog.evaluate((element) => [...element.querySelectorAll<HTMLElement>('*')].filter((node) => { const style = getComputedStyle(node); return /(auto|scroll)/.test(`${style.overflowY} ${style.overflow}`) && node.scrollHeight > node.clientHeight + 1; }).length);
  expect(scrollRegions).toBe(1);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBe(pageScroll);
  await dialog.getByLabel('Nombre del producto').fill('Mobile dialog scroll test');
  await dialog.locator('.catalog-dialog-body').evaluate((element) => element.scrollTop = element.scrollHeight);
  await expect(dialog.getByRole('button', { name: 'Crear producto' })).toBeInViewport();
  await dialog.getByRole('button', { name: 'Cerrar formulario' }).click();
  const sidebar = page.locator('.sidebar');
  expect(await sidebar.evaluate((element) => getComputedStyle(element).position)).toBe('static');
  const before = await sidebar.evaluate((element) => element.getBoundingClientRect().top);
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(before);
  await page.locator('.workspace-main').evaluate((element) => ({ sidebarBottom: element.previousElementSibling?.getBoundingClientRect().bottom, contentTop: element.getBoundingClientRect().top })).then(({ sidebarBottom, contentTop }) => expect(contentTop).toBeGreaterThanOrEqual(sidebarBottom ?? 0));
});

test('product create, edit, price history and reload are persisted', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openCatalog(page);
  const name = `Producto e2e ${Date.now()}`;
  const sku = `E2E-${Date.now()}`;
  try {
  await page.getByRole('button', { name: 'Nuevo producto' }).click();
  let dialog = page.getByRole('dialog', { name: 'Nuevo producto' });
  await dialog.getByLabel('Nombre del producto').fill(name);
  await dialog.locator('select').selectOption({ index: 1 });
  await dialog.getByLabel('SKU', { exact: true }).fill(sku);
  await dialog.getByLabel('Costo', { exact: true }).fill('35');
  await dialog.getByLabel('Precio normal').fill('150');
  await dialog.getByLabel('Stock inicial').fill('4');
  await dialog.getByRole('button', { name: 'Crear producto' }).click();
  const card = page.locator('.product-card').filter({ hasText: name });
  await expect(card).toBeVisible();
  await page.reload();
  const persistedCard = page.locator('.product-card').filter({ hasText: name });
  await expect(persistedCard).toBeVisible();
  await persistedCard.getByRole('button', { name: 'Editar' }).click();
  dialog = page.getByRole('dialog', { name: 'Editar producto' });
  await dialog.getByLabel('Nombre del producto').fill(`${name} actualizado`);
  await dialog.getByLabel('Costo', { exact: true }).fill('40');
  await dialog.getByLabel('Precio normal').fill('175');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  const updatedCard = page.locator('.product-card').filter({ hasText: `${name} actualizado` });
  await expect(updatedCard).toContainText('$175.00');
  await updatedCard.locator('.product-card-main').click();
  await expect(page.getByText('Historial de costo y precio')).toBeVisible();
  await expect(page.locator('.detail-history')).toContainText('Precio');
  await expect(page.locator('.detail-history')).toContainText('Costo');
  } finally {
  const cleanup = await page.evaluate(async (skuToFind) => {
    const variants = await (await fetch(`/api/products?q=${encodeURIComponent(skuToFind)}`)).json();
    if (!variants[0]) return 'not-found';
    const response = await fetch(`/api/products/${variants[0].product.id}`, { method: 'DELETE' });
    return response.status;
  }, sku);
  expect(['not-found', 200]).toContain(cleanup);
  }
});

test('variant action stays in its legend and adds a complete editable variant', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await openCatalog(page);
  await page.getByRole('button', { name: 'Nuevo producto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo producto' });
  const first = dialog.locator('.catalog-variant').first();
  const action = first.getByRole('button', { name: 'Agregar variante' });
  await expect(action).toBeVisible();
  await expect(action).toBeInViewport();
  const rects = await action.evaluate(button => ({ button: button.getBoundingClientRect(), legend: button.closest('legend')!.getBoundingClientRect() }));
  expect(rects.button.top).toBeGreaterThanOrEqual(rects.legend.top);
  expect(rects.button.bottom).toBeLessThanOrEqual(rects.legend.bottom + 2);
  await action.click();
  await expect(dialog.locator('.catalog-variant')).toHaveCount(2);
  const second = dialog.locator('.catalog-variant').nth(1);
  for (const label of ['SKU', 'Código de barras', 'Talla', 'Color', 'Stock inicial', 'Costo', 'Precio normal', 'Precio promocional', 'Límite de stock bajo']) await expect(second.getByLabel(label, { exact: true })).toBeVisible();
});

test('desktop sidebar stays viewport-height and mobile navigation is two-column in flow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await openCatalog(page);
  await page.locator('.workspace-main').evaluate(el => { el.style.minHeight = '1800px'; });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const sidebar = page.locator('.sidebar');
  await expect.poll(() => sidebar.evaluate(el => ({ top: Math.round(el.getBoundingClientRect().top), height: Math.round(el.getBoundingClientRect().height), position: getComputedStyle(el).position }))).toEqual({ top: 0, height: 800, position: 'sticky' });
  await expect(sidebar.getByText('lucem')).toBeVisible();
  await expect(sidebar.locator('nav a')).toHaveCount(8);
  for (const label of ['Resumen', 'Punto de venta', 'Productos', 'Inventario', 'Apartados', 'Devoluciones', 'Reportes', 'Auditoria']) await expect(sidebar.getByRole('link', { name: label })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const nav = sidebar.locator('nav');
  await expect(nav.locator('a')).toHaveCount(8);
  const mobile = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, position: getComputedStyle(document.querySelector('.sidebar')!).position, columns: getComputedStyle(document.querySelector('.sidebar nav')!).gridTemplateColumns.split(' ').length }));
  expect(mobile).toEqual({ width: 390, scrollWidth: 390, position: 'static', columns: 2 });
  for (const link of await nav.locator('a').all()) await expect(link).toBeVisible();
  await expect(sidebar.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
});

test('POS mobile cart summary and checkout sheet stay usable; desktop uses sticky split cart', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCatalog(page);
  await page.goto('/pos');
  const products = page.locator('.pos-product');
  await expect(products.first()).toBeVisible();
  await expect.poll(() => products.count()).toBeGreaterThanOrEqual(4);
  for (let index = 0; index < 4; index++) await products.nth(index).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const summary = page.locator('.pos-summary-mobile');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('4 unidades');
  await expect(summary).toContainText(/Total\s+\$[\d,.]+/);
  const summaryPosition = await summary.evaluate(el => getComputedStyle(el).position);
  expect(summaryPosition).toBe('fixed');
  await summary.getByRole('button').click();
  const sheet = page.getByRole('dialog', { name: 'Carrito y cobro' });
  await expect(sheet).toBeVisible();
  await sheet.locator('button[aria-label^="Agregar una unidad"]:not([disabled])').first().click();
  await expect(sheet.locator('.pos-sheet-header')).toContainText('5 unidades');
  await sheet.getByLabel('Método de pago').selectOption('CASH');
  await sheet.getByLabel('Efectivo recibido').fill('500');
  await expect(sheet).toContainText('Cambio:');
  await expect(sheet.locator('.pos-sheet-footer').getByRole('button', { name: 'Cobrar' })).toBeInViewport();
  const scrollRegions = await sheet.evaluate(el => [...el.querySelectorAll<HTMLElement>('*')].filter(node => { const style = getComputedStyle(node); return /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1; }).length);
  expect(scrollRegions).toBe(1);
  const beforeScroll = await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0);
  await page.mouse.wheel(0, 600);
  expect(await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBe(beforeScroll);
  await sheet.getByRole('button', { name: 'Cerrar carrito' }).click();
  await expect(sheet).toBeHidden();
  expect(await page.locator('.pos-sheet').evaluate(el => el.matches(':modal'))).toBe(false);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pos');
  await expect(page.locator('.pos-layout')).toHaveCSS('display', 'grid');
  await expect(page.locator('.pos-cart-desktop')).toBeVisible();
  expect(await page.locator('.pos-cart-desktop').evaluate(el => getComputedStyle(el).position)).toBe('sticky');
  await expect(page.locator('.pos-summary-mobile')).toBeHidden();
});
