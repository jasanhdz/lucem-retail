import { test, expect } from '@playwright/test';

for (const role of ['admin', 'seller', 'inventory'] as const) {
  test(`${role} sees legitimate workspace permissions`, async ({ browser }) => {
    const state = role === 'admin' ? 'admin-centro' : role;
    const context = await browser.newContext({ storageState: `playwright/.auth/${state}.json` });
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Resumen de tu negocio' })).toBeVisible();
    await expect(page.locator('.business-context-label strong:visible, .topbar-switch span:visible').filter({ hasText: 'DEV-TEST-01 Centro' }).first()).toBeVisible();
    if (role === 'admin') {
      await expect(page.getByText('$250.00').first()).toBeVisible();
      await expect(page.getByText('3 piezas', { exact: true })).toBeVisible();
      await expect(page.getByText('$100.00').first()).toBeVisible();
      await expect(page.getByText('$150.00').first()).toBeVisible();
      await expect(page.getByText(/#POS-\d+-0901/)).toBeVisible();
      await expect(page.getByText(/#POS-\d+-0902/)).toBeVisible();
      await expect(page.locator('.dashboard-alert-list').getByText('1 producto agotado').first()).toBeVisible();
    }
    const auditLink = page.getByRole('link', { name: 'Auditoría', exact: true });
    if (role === 'admin') await expect(auditLink).toBeVisible();
    else await expect(auditLink).toHaveCount(0);
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(body => body.clientWidth));
    const productsShortcut = page.locator('.dashboard-shortcut').filter({ hasText: 'Productos' }).first();
    await productsShortcut.focus();
    await expect(productsShortcut).toBeFocused();
    expect(await productsShortcut.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return rect.width >= 44 && rect.height >= 44 && Boolean(element.textContent?.trim());
    })).toBeTruthy();
    await context.close();
  });
}

test('logout invalidates the real session and protected pages redirect', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'playwright/.auth/seller.json' });
  const page = await context.newPage();
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /DEV-TEST-01 Seller/ }).click();
  const logout = page.getByRole('button', { name: 'Cerrar sesión' });
  await logout.click();
  await expect(page).toHaveURL(/\/login$/);
  const protectedResponse = await page.request.get('/dashboard', { maxRedirects: 0 });
  expect(protectedResponse.status()).toBe(307);
  expect(protectedResponse.headers().location).toBe('/login');
  await context.close();
});
