import { expect, test } from '@playwright/test';

const viewports = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } } as const;
const routes = [
  ['/login', 'auth-login', false], ['/registro', 'auth-register', false], ['/negocios/crear', 'onboarding-business', false], ['/negocios/giro', 'onboarding-giro', false], ['/negocios/confirmacion', 'onboarding-confirmation', false],
  ['/dashboard', 'dashboard-shell', true], ['/pos', 'pos-main', true], ['/tickets/dev-test-01-centro-sale-one', 'pos-ticket', true], ['/productos', 'products-catalog', true], ['/inventario', 'inventory-main', true], ['/inventario/movimientos', 'inventory-movements', true], ['/inventario/dev-test-01-centro-normal', 'inventory-detail', true], ['/apartados', 'reservations', true], ['/devoluciones', 'returns', true],
] as const;

async function visit(page: import('@playwright/test').Page, route: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { await page.goto(route, { waitUntil: 'domcontentloaded' }); return; } catch (error) { if (attempt === 2) throw error; }
  }
}

test('captures the implemented MVP surfaces at Stitch comparison sizes', async ({ browser, page }) => {
  const anonymous = await browser.newPage();
  try {
    for (const [route, name, authenticated] of routes) {
      const target = authenticated ? page : anonymous;
      for (const [viewportName, viewport] of Object.entries(viewports)) {
        await target.setViewportSize(viewport);
        await visit(target, route);
        await expect(target.locator('body')).toBeVisible();
        await target.screenshot({ path: `docs/ui-redesign/dev-11-visual-evidence/${name}-${viewportName}.png`, fullPage: false });
      }
    }
  } finally {
    await anonymous.close();
  }
});
