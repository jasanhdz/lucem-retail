import { test, expect } from '@playwright/test';

test('authenticated dashboard screenshot is real E2E evidence', async ({ page }, testInfo) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Buenos días, aquí tienes el pulso de tu negocio.' })).toBeVisible();
  await expect(page.getByText('DEV-TEST-01 Centro')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
  await page.screenshot({ path: testInfo.outputPath(`dashboard-${testInfo.project.name}-DEV-TEST-01.png`), fullPage: false });
});
