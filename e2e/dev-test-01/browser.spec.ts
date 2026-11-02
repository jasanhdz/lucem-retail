import { test, expect } from '@playwright/test';

for (const role of ['admin', 'seller', 'inventory'] as const) {
  test(`${role} sees legitimate workspace permissions`, async ({ browser }) => {
    const context = await browser.newContext({ storageState: `playwright/.auth/${role}.json` });
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Buenos días, aquí tienes el pulso de tu negocio.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'DEV-TEST-01 Centro' })).toBeVisible();
    if (role === 'admin') {
      await expect(page.getByText('$250.00').first()).toBeVisible();
      await expect(page.getByText('3', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('$100.00').first()).toBeVisible();
      await expect(page.getByText('$150.00').first()).toBeVisible();
      await expect(page.getByText('Venta #901')).toBeVisible();
      await expect(page.getByText('Venta #902')).toBeVisible();
      await expect(page.getByText('1 producto requiere atención')).toBeVisible();
    }
    const auditLink = page.getByRole('link', { name: 'Auditoría' });
    if (role === 'admin') await expect(auditLink).toBeVisible();
    else await expect(auditLink).toHaveCount(0);
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(body => body.clientWidth));
    await page.getByRole('link', { name: 'Catálogo' }).focus();
    await expect(page.getByRole('link', { name: 'Catálogo' })).toBeFocused();
    expect(await page.getByRole('link', { name: 'Catálogo' }).evaluate(element => {
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
