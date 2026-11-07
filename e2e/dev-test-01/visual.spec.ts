import { test, expect } from '@playwright/test';

test('authenticated dashboard screenshot is real E2E evidence', async ({ page }, testInfo) => {
  await page.goto('/dashboard');

  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveAccessibleName('Resumen de tu negocio');
  await expect(heading).toBeVisible();
  if (testInfo.project.name === 'visual-mobile') {
    await expect(page.locator('.topbar-switch:visible')).toContainText('DEV-TEST-01 Centro');
  } else {
    await expect(page.getByText('DEV-TEST-01 Centro', { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText('$250.00').first()).toBeVisible();

  const primaryCta = page.locator('.topbar-cta');
  await expect(primaryCta).toHaveAccessibleName(/Nueva venta/);
  await expect(primaryCta).toBeVisible();

  const shortcut = page.locator('.dashboard-shortcut').filter({ hasText: 'Productos' }).first();
  await shortcut.focus();
  await expect(shortcut).toBeFocused();
  await expect.poll(() => shortcut.evaluate(element => {
    const outline = getComputedStyle(element).outline;
    return outline !== 'none' && !/^0px(?:\s+0px){0,3}/.test(outline);
  })).toBeTruthy();

  const shellNavigation = page.getByRole('navigation', {
    name: testInfo.project.name === 'visual-mobile' ? 'Navegación móvil' : 'Secciones del negocio',
  });
  await expect(shellNavigation).toBeVisible();
  const shellLink = shellNavigation.locator('a').first();
  await expect(shellLink).toHaveAccessibleName(/\S+/);
  await shellLink.focus();
  await expect(shellLink).toBeFocused();

  expect(await page.locator('.dashboard-page').evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();

  const undersizedControls = await page.locator('.dashboard-page a, .dashboard-page button').evaluateAll(elements => elements.flatMap(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
      && rect.width > 0 && rect.height > 0
      && rect.right > 0 && rect.bottom > 0
      && rect.left < window.innerWidth && rect.top < window.innerHeight;
    if (!visible || (element.closest('[hidden]'))) return [];
    return rect.width >= 44 && rect.height >= 44 ? [] : [{
      name: element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ') || element.tagName,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }];
  }));
  expect(undersizedControls, 'visible dashboard controls must have a 44px hit area').toEqual([]);

  await page.screenshot({ path: testInfo.outputPath(`admin-DEV-TEST-01-url-dashboard-${testInfo.project.name}-real-HEAD-${process.env.GITHUB_SHA ?? 'local'}.png`), fullPage: false });
});
