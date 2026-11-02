import { test, expect } from '@playwright/test';

test('authenticated dashboard screenshot is real E2E evidence', async ({ page }, testInfo) => {
  const login = await page.request.post('/api/auth/login', { data: { email: 'dev-test-01-admin@invalid.test', password: process.env.E2E_ADMIN_PASSWORD } });
  expect(login.status()).toBe(200);
  const select = await page.request.post('/api/businesses/select', { data: { businessId: 'dev-test-01-centro' } });
  expect(select.status()).toBe(200);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Buenos días, aquí tienes el pulso de tu negocio.' })).toBeVisible();
  await expect(page.locator('.business-context-label strong:visible, .topbar-switch span:visible').filter({ hasText: 'DEV-TEST-01 Centro' }).first()).toBeVisible();
  await expect(page.getByText('$250.00').first()).toBeVisible();
  await page.getByRole('link', { name: 'Catálogo' }).focus();
  await expect(page.getByRole('link', { name: 'Catálogo' })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath(`admin-DEV-TEST-01-url-dashboard-${testInfo.project.name}-real-HEAD-${process.env.GITHUB_SHA ?? 'local'}.png`), fullPage: false });
});
