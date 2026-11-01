import { test, expect } from '@playwright/test';

for (const role of ['admin', 'seller', 'inventory'] as const) {
  test(`${role} sees legitimate workspace permissions`, async ({ browser }) => {
    const context = await browser.newContext({ storageState: `playwright/.auth/${role}.json` });
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Buenos días, aquí tienes el pulso de tu negocio.' })).toBeVisible();
    await expect(page.getByText('DEV-TEST-01 Centro')).toBeVisible();
    const auditLink = page.getByRole('link', { name: 'Auditoría' });
    if (role === 'admin') await expect(auditLink).toBeVisible();
    else await expect(auditLink).toHaveCount(0);
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(body => body.clientWidth));
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
