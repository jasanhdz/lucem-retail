import { test, expect } from '@playwright/test';

test('authenticated dashboard screenshot is real E2E evidence', async ({ page }, testInfo) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Buenos días, aquí tienes el pulso de tu negocio.' })).toBeVisible();
  await expect(page.getByText('DEV-TEST-01 Centro')).toBeVisible();
  await expect(page.getByText('$250.00').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
  await page.getByRole('link', { name: 'Catálogo' }).focus();
  await expect(page.getByRole('link', { name: 'Catálogo' })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath(`admin-DEV-TEST-01-url-dashboard-${testInfo.project.name}-real-HEAD-${process.env.GITHUB_SHA ?? 'local'}.png`), fullPage: false });
});
