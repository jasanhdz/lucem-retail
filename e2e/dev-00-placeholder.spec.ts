import { expect, test } from '@playwright/test';

test('public placeholder routes share exact content', async ({ page }) => {
  for (const route of ['/', '/login', '/negocios']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: 'Lucem Retail' })).toBeVisible();
    await expect(page.getByText('Estamos preparando la nueva interfaz.', { exact: true })).toBeVisible();
  }
});

test('protected workspace redirects without authentication', async ({ page, request }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
  for (const endpoint of ['/api/businesses', '/api/categories', '/api/products', '/api/inventory', '/api/reservations', '/api/sales', '/api/returns', '/api/dashboard', '/api/reports/sales', '/api/audit']) {
    expect((await request.get(endpoint)).status()).toBe(401);
  }
});
