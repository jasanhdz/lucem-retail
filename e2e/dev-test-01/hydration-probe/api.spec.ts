import { expect, test, type Page, type TestInfo } from '@playwright/test';

type HydrationProbeRecord = {
  route: string;
  responseStatus: number | null;
  serverInputStyleAttributes: string[];
  hydratedInputStyles: Array<{ id: string; type: string; style: string | null }>;
  styleMutations: Array<{ id: string; type: string; oldStyle: string | null; style: string | null }>;
  hydrationWarnings: string[][];
};

async function installStyleProbe(page: Page) {
  await page.addInitScript(() => {
    const changes: Array<{ id: string; type: string; oldStyle: string | null; style: string | null }> = [];
    Object.defineProperty(window, '__qa03StyleChanges', { value: changes, configurable: false });
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type !== 'attributes' || record.attributeName !== 'style' || !(record.target instanceof HTMLInputElement)) continue;
        changes.push({ id: record.target.id, type: record.target.type, oldStyle: record.oldValue, style: record.target.getAttribute('style') });
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style'], attributeOldValue: true });
  });
}

function observeHydrationWarnings(page: Page, route: () => string, warningMap: Map<string, string[][]>) {
  page.on('console', (message) => {
    if (message.type() !== 'error' || !message.text().includes('hydrated but some attributes')) return;
    const snippets = message.text().split('\n').map((line) => line.trim()).filter((line) => /[+-]\s+style=/.test(line));
    const currentRoute = route();
    const warnings = warningMap.get(currentRoute) ?? [];
    warnings.push(snippets);
    warningMap.set(currentRoute, warnings);
  });
}

async function inspectRoute(page: Page, route: string, records: HydrationProbeRecord[], warningMap: Map<string, string[][]>) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();
  const serverHtml = response ? await response.text() : '';
  const serverInputStyleAttributes = [...serverHtml.matchAll(/<input\b[^>]*\bstyle=(?:"[^"]*"|'[^']*')/gi)].map((match) => match[0].match(/\bstyle=(?:"[^"]*"|'[^']*')/i)?.[0] ?? 'style attribute');
  const [hydratedInputStyles, styleMutations] = await page.evaluate(() => {
    const windowWithProbe = window as Window & { __qa03StyleChanges?: HydrationProbeRecord['styleMutations'] };
    return [
      [...document.querySelectorAll<HTMLInputElement>('input[style]')].map((input) => ({ id: input.id, type: input.type, style: input.getAttribute('style') })),
      [...(windowWithProbe.__qa03StyleChanges ?? [])],
    ];
  });
  records.push({ route, responseStatus: response?.status() ?? null, serverInputStyleAttributes, hydratedInputStyles, styleMutations, hydrationWarnings: warningMap.get(route) ?? [] });
}

test('QA-03 diagnostic compares SSR input style attributes with hydrated E2E routes', async ({ page, browser }, testInfo: TestInfo) => {
  test.setTimeout(120_000);
  const records: HydrationProbeRecord[] = [];
  const warningMap = new Map<string, string[][]>();
  let currentRoute = '';
  await installStyleProbe(page);
  observeHydrationWarnings(page, () => currentRoute, warningMap);
  for (const route of ['/negocios/crear', '/productos', '/productos/nuevo', '/inventario', '/inventario/movimientos', '/pos', '/apartados', '/devoluciones']) {
    currentRoute = route;
    await inspectRoute(page, route, records, warningMap);
  }

  const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const anonymousPage = await anonymous.newPage();
  await installStyleProbe(anonymousPage);
  observeHydrationWarnings(anonymousPage, () => currentRoute, warningMap);
  currentRoute = '/login';
  await inspectRoute(anonymousPage, '/login', records, warningMap);
  await anonymous.close();

  await testInfo.attach('qa03-hydration-style-probe.json', { body: JSON.stringify(records, null, 2), contentType: 'application/json' });
  console.info(`QA-03 SSR/hydration input-style probe: ${JSON.stringify(records.map(({ route, responseStatus, serverInputStyleAttributes, hydratedInputStyles, styleMutations, hydrationWarnings }) => ({ route, responseStatus, serverInputStyleAttributes, hydratedInputStyles, styleMutations, hydrationWarnings })))}`);
  expect(records).toHaveLength(9);
});
