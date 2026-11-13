import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { qaConfig } from '../../qa/config';
import { sanitize } from '../../scripts/qa/core';

type BrowserEvent = { type: string; url?: string; route?: string; message?: string; status?: number; expected?: boolean; method?: string; resourceType?: string; navigationRequest?: boolean };
type HydrationStyleRecord = { route: string; viewport: string; responseStatus: number | null; ssrInputs: Array<{ id: string | null; type: string | null; style: string | null }>; hydratedInputs: Array<{ id: string; type: string; style: string | null }>; styleMutations: Array<{ id: string; type: string; oldStyle: string | null; style: string | null }>; hydrationWarnings: string[] };
function modulePages<T extends { area: string }>(pages: T[]) {
  const area = process.env.QA_MODULE;
  return area ? pages.filter((page) => page.area === area) : pages;
}
function redactedUrl(raw: string) { try { const parsed = new URL(raw); return `${parsed.origin}${parsed.pathname}`; } catch { return '[invalid-url]'; } }
function pageRoute(page: Page) { try { return new URL(page.url()).pathname; } catch { return 'unknown'; } }
function attachBrowserObservers(page: Page) {
  const events: BrowserEvent[] = [];
  page.on('console', (message) => { if (message.type() === 'error') events.push({ type: 'console-error', route: pageRoute(page), message: message.text().slice(0, 5000) }); });
  page.on('pageerror', (error) => events.push({ type: 'page-error', route: pageRoute(page), message: error.message.slice(0, 500) }));
  page.on('requestfailed', (request) => {
    const message = request.failure()?.errorText?.slice(0, 300);
    const navigationRequest = request.isNavigationRequest();
    const expectedNavigationAbort = navigationRequest && /net::ERR_ABORTED/i.test(message ?? '');
    events.push({ type: 'request-failed', url: redactedUrl(request.url()), route: pageRoute(page), method: request.method(), resourceType: request.resourceType(), navigationRequest, message, expected: expectedNavigationAbort });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      const url = redactedUrl(response.url());
      const expected = response.status() === 401 && url.endsWith('/api/auth/login');
      events.push({ type: response.status() >= 500 ? 'http-5xx' : 'http-4xx', url, route: pageRoute(page), status: response.status(), expected });
    }
  });
  return events;
}
async function persistEvents(events: BrowserEvent[], testInfo: TestInfo) {
  const base = path.resolve(process.env.QA_REPORT_DIR || 'test-results/qa-01');
  const output = path.join(base, 'browser-events'); await mkdir(output, { recursive: true });
  const filename = `${testInfo.testId.replace(/[^a-z0-9_-]/gi, '-')}.json`;
  const secrets = [process.env.QA_DATABASE_URL, process.env.QA_SESSION_SECRET, process.env.QA_POSTGRES_PASSWORD, process.env.E2E_ADMIN_PASSWORD, process.env.E2E_SELLER_PASSWORD, process.env.E2E_INVENTORY_PASSWORD].filter((value): value is string => Boolean(value));
  await writeFile(path.join(output, filename), sanitize(JSON.stringify({ title: testInfo.title, events }, null, 2), secrets));
}
async function openPage(page: Page, route: string, events: BrowserEvent[]) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  if (!response || response.status() >= 400) events.push({ type: 'unexpected-navigation-status', url: route, status: response?.status() ?? 0 });
  await page.evaluate(() => document.fonts.ready);
}
async function responsiveMetrics(page: Page) {
  return page.evaluate(() => {
    const hasAccessibleLocalScroller = (element: HTMLElement) => {
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        const rect = parent.getBoundingClientRect();
        const isScrollable = (style.overflowX === 'auto' || style.overflowX === 'scroll') && parent.scrollWidth > parent.clientWidth + 1;
        const isNamed = Boolean(parent.getAttribute('aria-label') || parent.getAttribute('aria-labelledby'));
        const hasKeyboardControl = parent.tabIndex >= 0 || Boolean(parent.querySelector('button:not(:disabled),a[href],input,select,textarea'));
        const isNamedAndKeyboardReachable = isNamed && hasKeyboardControl;
        if (isScrollable && isNamedAndKeyboardReachable && rect.left >= -1 && rect.right <= window.innerWidth + 1) return true;
        parent = parent.parentElement;
      }
      return false;
    };
    const doc = document.documentElement;
    const offscreen = [...document.querySelectorAll<HTMLElement>('button,input,select,textarea')].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1) && !hasAccessibleLocalScroller(element);
    });
    const describe = (element: HTMLElement) => `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).trim().replace(/\s+/g, '.')}` : ''}[${element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.innerText?.trim().slice(0, 40) || ''}]`;
    const offscreenDetails = offscreen.map((element) => `${describe(element)} right=${Math.round(element.getBoundingClientRect().right)}`);
    const overflowElements = [...document.querySelectorAll<HTMLElement>('body *')].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.right > window.innerWidth + 1;
    }).slice(0, 12).map((element) => `${describe(element)} right=${Math.round(element.getBoundingClientRect().right)} width=${Math.round(element.getBoundingClientRect().width)}`);
    const controls = [...document.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')].filter((element) => !element.closest('.input-wrap') && !(element.tagName === 'A' && getComputedStyle(element).display === 'inline')).map((element) => ({ element, rect: element.getBoundingClientRect(), name: element.getAttribute('aria-label') || element.getAttribute('name') || element.id || element.innerText?.trim().slice(0, 48) || element.tagName.toLowerCase() })).filter((item) => item.rect.width > 0 && item.rect.height > 0);
    const overlapDetails: string[] = [];
    for (let i = 0; i < controls.length; i += 1) for (let j = i + 1; j < controls.length; j += 1) {
      const a = controls[i].rect; const b = controls[j].rect;
      const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const area = overlapWidth * overlapHeight; const smallerArea = Math.min(a.width * a.height, b.width * b.height);
      if (smallerArea > 0 && area / smallerArea > 0.95) overlapDetails.push(`${controls[i].element.tagName.toLowerCase()}[${controls[i].name}] overlaps ${controls[j].element.tagName.toLowerCase()}[${controls[j].name}]`);
    }
    return { overflowPx: Math.max(0, doc.scrollWidth - window.innerWidth), offscreenControls: offscreen.length, offscreenDetails, overflowElements, overlappingControls: overlapDetails.length, overlapDetails, width: window.innerWidth, height: window.innerHeight };
  });
}
const testRoute = test.extend<{ observed: BrowserEvent[] }>({
  observed: async ({ page }, use, testInfo) => {
    const events = attachBrowserObservers(page);
    await use(events);
    await persistEvents(events, testInfo);
  },
});

testRoute('anonymous landing page offers a login action @qa-observe @module-auth', async ({ page, observed }, testInfo) => {
  await openPage(page, '/', observed);
  await expect(page.getByRole('heading', { name: /Tu tienda/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Iniciar sesión/ })).toBeVisible();
  await persistEvents(observed, testInfo);
});

testRoute('login exposes native invalid-email and visible-password states @qa-observe @module-auth', async ({ page, observed }) => {
  await openPage(page, '/login', observed);
  const email = page.getByLabel('Correo electrónico', { exact: true }); const password = page.getByLabel('Contraseña', { exact: true });
  await email.fill('not-an-email'); await page.getByRole('button', { name: /Iniciar sesión/ }).click();
  expect(await email.evaluate((element) => !(element as HTMLInputElement).validity.valid)).toBe(true);
  const root = path.resolve(process.env.QA_REPORT_DIR || 'test-results/qa-01'); const stateDir = path.join(root, 'screenshots', 'login', 'states'); await mkdir(stateDir, { recursive: true });
  await page.screenshot({ path: path.join(stateDir, 'invalid-email.png'), fullPage: true, animations: 'disabled' });
  await email.fill(''); await password.fill('');
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.screenshot({ path: path.join(stateDir, 'password-visible.png'), fullPage: true, animations: 'disabled' });
});

testRoute('public screens render at desktop, tablet and mobile sizes @qa-observe @qa-visual', async ({ page, observed }, testInfo) => {
  const root = path.resolve(process.env.QA_REPORT_DIR || 'test-results/qa-01');
  const failures: Array<{ page: string; viewport: string; overflowPx: number; offscreenControls: number; offscreenDetails: string[]; overflowElements: string[]; overlappingControls: number; overlapDetails: string[] }> = [];
  const screens = modulePages(qaConfig.publicPages);
  if (!screens.length) test.skip(true, `No public screens are registered for module ${process.env.QA_MODULE}.`);
  for (const screen of screens) {
    for (const viewport of qaConfig.viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openPage(page, screen.path, observed);
      const metrics = await responsiveMetrics(page);
      const folder = path.join(root, 'screenshots', screen.id); await mkdir(folder, { recursive: true });
      const file = path.join(folder, `${viewport.id}-${viewport.width}x${viewport.height}.png`);
      const image = await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
      const baseline = path.resolve('qa/visual-baselines', screen.id, `${viewport.id}.png`);
      if (existsSync(baseline)) {
        const expected = await readFile(baseline);
        expect(image, `visual baseline ${screen.id}/${viewport.id}; no baseline auto-update`).toMatchSnapshot(`${screen.id}/${viewport.id}.png`, { threshold: 0.18, maxDiffPixelRatio: 0.02 });
        if (!expected.length) observed.push({ type: 'visual-baseline-empty', message: baseline });
      } else observed.push({ type: 'visual-baseline-not-approved', message: `${screen.id}/${viewport.id}; ${screen.stitch ? `Stitch reference ${screen.stitch}` : 'no approved Stitch design reference'}` });
      if (metrics.overflowPx > 0 || metrics.offscreenControls > 0 || metrics.overlappingControls > 0) failures.push({ page: screen.path, viewport: viewport.id, ...metrics });
      testInfo.annotations.push({ type: 'viewport', description: `${screen.path} ${viewport.width}x${viewport.height}` });
    }
  }
  await mkdir(path.join(root, 'responsive'), { recursive: true });
  await writeFile(path.join(root, 'responsive', 'overflow-findings.json'), JSON.stringify({ generatedAt: new Date().toISOString(), viewports: qaConfig.viewports, failures }, null, 2));
  await persistEvents(observed, testInfo);
  expect(failures, 'horizontal overflow or controls beyond viewport').toEqual([]);
});

testRoute('public screens pass configured axe rules @qa-axe', async ({ page, observed }, testInfo) => {
  const results = [];
  const screens = modulePages(qaConfig.publicPages);
  if (!screens.length) test.skip(true, `No public screens are registered for module ${process.env.QA_MODULE}.`);
  for (const screen of screens) {
    await openPage(page, screen.path, observed);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    results.push({ route: screen.path, violations: axe.violations.map((violation) => ({ id: violation.id, impact: violation.impact, description: violation.description, helpUrl: violation.helpUrl, nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })) });
    if (axe.violations.length) {
      const root = path.resolve(process.env.QA_REPORT_DIR || 'test-results/qa-01'); await mkdir(path.join(root, 'screenshots', 'accessibility'), { recursive: true });
      await page.screenshot({ path: path.join(root, 'screenshots', 'accessibility', `${screen.id}-violations.png`), fullPage: true, animations: 'disabled' });
    }
  }
  const root = path.resolve(process.env.QA_REPORT_DIR || 'test-results/qa-01'); await mkdir(path.join(root, 'accessibility'), { recursive: true });
  const secrets = [process.env.QA_DATABASE_URL, process.env.E2E_ADMIN_PASSWORD].filter((value): value is string => Boolean(value));
  await writeFile(path.join(root, 'accessibility', 'axe-findings.json'), sanitize(JSON.stringify(results, null, 2), secrets));
  const blocking = results.flatMap((result) => result.violations).filter((violation) => qaConfig.thresholds.accessibilityFailImpacts.includes(violation.impact as 'critical' | 'serious'));
  expect(blocking, 'axe critical/serious violations').toEqual([]);
});

testRoute('public navigation performance is sampled five times @qa-performance', async ({ page, observed }, testInfo) => {
  const samples: Array<{ route: string; durationMs: number }> = [];
  const screens = modulePages(qaConfig.publicPages);
  if (!screens.length) test.skip(true, `No public screens are registered for module ${process.env.QA_MODULE}.`);
  for (const screen of screens) {
    await openPage(page, screen.path, observed); // warm Next's first compilation/request before measuring
    for (let index = 0; index < 5; index += 1) {
      const started = performance.now(); await openPage(page, screen.path, observed); samples.push({ route: screen.path, durationMs: performance.now() - started });
    }
  }
  const sorted = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
  const p50 = Math.round(sorted[Math.floor(sorted.length * 0.5)]);
  const p95 = Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]);
  const root = path.resolve(process.env.QA_REPORT_DIR || 'test-results/qa-01'); await mkdir(path.join(root, 'performance'), { recursive: true });
  await writeFile(path.join(root, 'performance', 'navigation-samples.json'), JSON.stringify({ samples, p50Ms: p50, p95Ms: p95, thresholdMs: qaConfig.thresholds.publicNavigationP95Ms, repetitionsPerRoute: 5 }, null, 2));
  testInfo.annotations.push({ type: 'performance', description: `navigation p50=${p50}ms p95=${p95}ms n=${samples.length}; threshold=${qaConfig.thresholds.publicNavigationP95Ms}ms` });
  expect(p95, 'public navigation p95 threshold').toBeLessThan(qaConfig.thresholds.publicNavigationP95Ms);
});

testRoute('login rejects invalid synthetic credentials @qa-functional @module-auth', async ({ page, observed }, testInfo) => {
  await openPage(page, '/login', observed);
  await page.getByLabel('Correo electrónico').fill(`qa-invalid-${Date.now()}@invalid.test`);
  await page.getByLabel('Contraseña', { exact: true }).fill('intentionally-invalid-qa-password');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
  await persistEvents(observed, testInfo);
});

testRoute('valid seeded admin can authenticate and reach business selection @qa-functional @module-auth', async ({ page, observed }, testInfo) => {
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!password) test.skip(true, 'E2E_ADMIN_PASSWORD is required for isolated QA auth fixtures.');
  await openPage(page, '/login', observed);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Correo electrónico').fill('dev-test-01-admin@invalid.test');
  await page.getByLabel('Contraseña', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/negocios(?:$|\?)/, { timeout: 15_000 });
  await persistEvents(observed, testInfo);
});

testRoute.describe('isolated authenticated QA fixture', () => {
  testRoute.use({ storageState: path.resolve('playwright/.auth/admin-centro.json') });

  testRoute('QA-03 captures authenticated SSR and hydration style deltas @qa-db-hydration', async ({ page, browser, observed }, testInfo) => {
    testRoute.setTimeout(240_000);
    const records: HydrationStyleRecord[] = [];
    const warningMap = new Map<string, string[]>();
    let currentRoute = 'unknown';
    page.on('console', (message) => {
      if (message.type() !== 'error' || !message.text().includes('hydrated but some attributes')) return;
      const warnings = warningMap.get(currentRoute) ?? [];
      warnings.push(message.text());
      warningMap.set(currentRoute, warnings);
    });
    await page.addInitScript(() => {
      const changes: Array<{ id: string; type: string; oldStyle: string | null; style: string | null }> = [];
      Object.defineProperty(window, '__qa03StyleChanges', { value: changes, configurable: false });
      new MutationObserver((entries) => {
        for (const entry of entries) {
          if (entry.type !== 'attributes' || entry.attributeName !== 'style' || !(entry.target instanceof HTMLInputElement)) continue;
          changes.push({ id: entry.target.id, type: entry.target.type, oldStyle: entry.oldValue, style: entry.target.getAttribute('style') });
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style'], attributeOldValue: true });
    });
    const capture = async (targetPage: Page, route: string, viewport: string) => {
      currentRoute = route;
      const previousWarnings = warningMap.get(route)?.length ?? 0;
      const url = new URL(route, 'http://127.0.0.1:3113').href;
      const ssr = await targetPage.request.get(url);
      const html = await ssr.text();
      const ssrInputs = [...html.matchAll(/<input\b[^>]*>/gi)].map(([tag]) => ({
        id: /\bid=(?:"([^"]*)"|'([^']*)')/i.exec(tag)?.[1] ?? /\bid=(?:"([^"]*)"|'([^']*)')/i.exec(tag)?.[2] ?? null,
        type: /\btype=(?:"([^"]*)"|'([^']*)')/i.exec(tag)?.[1] ?? /\btype=(?:"([^"]*)"|'([^']*)')/i.exec(tag)?.[2] ?? null,
        style: /\bstyle=(?:"([^"]*)"|'([^']*)')/i.exec(tag)?.[1] ?? /\bstyle=(?:"([^"]*)"|'([^']*)')/i.exec(tag)?.[2] ?? null,
      }));
      await targetPage.evaluate(() => (window as Window & { __qa03StyleChanges?: unknown[] }).__qa03StyleChanges?.splice(0));
      const response = await targetPage.goto(url, { waitUntil: 'domcontentloaded' });
      await targetPage.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
      await expect(targetPage.locator('body')).toBeVisible();
      const [hydratedInputs, styleMutations] = await targetPage.evaluate(() => {
        const probeWindow = window as Window & { __qa03StyleChanges?: HydrationStyleRecord['styleMutations'] };
        return [
          [...document.querySelectorAll<HTMLInputElement>('input')].map((input) => ({ id: input.id, type: input.type, style: input.getAttribute('style') })),
          [...(probeWindow.__qa03StyleChanges ?? [])],
        ];
      });
      records.push({ route, viewport, responseStatus: response?.status() ?? null, ssrInputs, hydratedInputs, styleMutations, hydrationWarnings: (warningMap.get(route) ?? []).slice(previousWarnings) });
    };
    for (const screen of qaConfig.authenticatedPages) for (const viewport of qaConfig.viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await capture(page, screen.path, viewport.id);
    }
    const anonymousContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const anonymousPage = await anonymousContext.newPage();
    const anonymousEvents = attachBrowserObservers(anonymousPage);
    anonymousPage.on('console', (message) => {
      if (message.type() !== 'error' || !message.text().includes('hydrated but some attributes')) return;
      const warnings = warningMap.get('/login') ?? [];
      warnings.push(message.text());
      warningMap.set('/login', warnings);
    });
    await anonymousPage.addInitScript(() => {
      const changes: Array<{ id: string; type: string; oldStyle: string | null; style: string | null }> = [];
      Object.defineProperty(window, '__qa03StyleChanges', { value: changes, configurable: false });
      new MutationObserver((entries) => {
        for (const entry of entries) {
          if (entry.type !== 'attributes' || entry.attributeName !== 'style' || !(entry.target instanceof HTMLInputElement)) continue;
          changes.push({ id: entry.target.id, type: entry.target.type, oldStyle: entry.oldValue, style: entry.target.getAttribute('style') });
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style'], attributeOldValue: true });
    });
    try { await anonymousPage.setViewportSize({ width: 1440, height: 900 }); await capture(anonymousPage, '/login', 'desktop'); observed.push(...anonymousEvents); }
    finally { await anonymousContext.close(); }
    const root = path.resolve(process.env.QA_REPORT_DIR || 'test-results/qa-01');
    await mkdir(path.join(root, 'hydration'), { recursive: true });
    const secrets = [process.env.QA_DATABASE_URL, process.env.E2E_ADMIN_PASSWORD].filter((value): value is string => Boolean(value));
    const report = { browserVersion: browser.version(), context: 'Playwright Chromium QA context; no extension is configured by the QA Playwright project', occurrences: records.flatMap((record) => record.hydrationWarnings.map((warning) => ({ route: record.route, warning }))), records };
    const serialized = sanitize(JSON.stringify(report, null, 2), secrets);
    await writeFile(path.join(root, 'hydration', 'hydration-probe.json'), serialized);
    await testInfo.attach('qa03-hydration-probe.json', { body: serialized, contentType: 'application/json' });
    await persistEvents(observed, testInfo);
    expect(records).toHaveLength(qaConfig.authenticatedPages.length * qaConfig.viewports.length + 1);
  });

  testRoute('registered workspace pages render at all required viewports @qa-db-visual', async ({ page, observed }, testInfo) => {
    testRoute.setTimeout(120_000);
    const root = path.resolve(process.env.QA_REPORT_DIR || 'test-results/qa-01');
    const failures: Array<{ page: string; viewport: string; overflowPx: number; offscreenControls: number; offscreenDetails: string[]; overflowElements: string[]; overlappingControls: number; overlapDetails: string[] }> = [];
    const screens = modulePages(qaConfig.authenticatedPages);
    const narrowScreens = new Set(['products', 'product-create', 'inventory', 'kardex', 'reservations']);
    const narrowViewport = { id: 'mobile-narrow', width: 320, height: 568 };
    const observedViewports = new Map<string, { id: string; width: number; height: number }>();
    if (!screens.length) test.skip(true, `No authenticated screens are registered for module ${process.env.QA_MODULE}.`);
    for (const screen of screens) for (const viewport of [...qaConfig.viewports, ...(narrowScreens.has(screen.id) ? [narrowViewport] : [])]) {
      observedViewports.set(viewport.id, viewport);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openPage(page, screen.path, observed);
      const measurement = await responsiveMetrics(page);
      if (screen.id === 'products' && viewport.width <= 768) {
        await expect(page.getByRole('group', { name: 'Filtros rápidos' })).toHaveAttribute('tabindex', '0');
      }
      if (screen.id === 'kardex' && viewport.width <= 768) {
        await expect(page.getByRole('group', { name: 'Tipo de movimiento' })).toHaveAttribute('tabindex', '0');
      }
      const folder = path.join(root, 'screenshots', screen.id); await mkdir(folder, { recursive: true });
      const file = path.join(folder, `${viewport.id}-${viewport.width}x${viewport.height}.png`);
      const image = await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
      const baseline = path.resolve('qa/visual-baselines', screen.id, `${viewport.id}.png`);
      if (existsSync(baseline)) expect(image, `visual baseline ${screen.id}/${viewport.id}`).toMatchSnapshot(`${screen.id}/${viewport.id}.png`, { threshold: 0.18, maxDiffPixelRatio: 0.02 });
      else observed.push({ type: 'visual-baseline-not-approved', message: `${screen.id}/${viewport.id}; no approved baseline` });
      const scrollGroup = screen.id === 'products' ? page.getByRole('group', { name: 'Filtros rápidos' }) : screen.id === 'kardex' ? page.getByRole('group', { name: 'Tipo de movimiento' }) : screen.id === 'reservations' ? page.getByRole('group', { name: 'Filtrar apartados' }) : undefined;
      if (scrollGroup && viewport.width <= 768) {
        await expect(scrollGroup).toHaveAttribute('tabindex', '0');
        const lastControl = scrollGroup.getByRole('button').last();
        await lastControl.focus();
        await expect(lastControl).toBeFocused();
      }
      if (measurement.overflowPx > 0 || measurement.offscreenControls > 0 || measurement.overlappingControls > 0) failures.push({ page: screen.path, viewport: viewport.id, ...measurement });
    }
    await mkdir(path.join(root, 'responsive'), { recursive: true });
    await writeFile(path.join(root, 'responsive', 'authenticated-overflow-findings.json'), JSON.stringify({ viewports: [...observedViewports.values()], failures }, null, 2));
    await persistEvents(observed, testInfo);
    expect(failures, 'authenticated workspace responsive overflow').toEqual([]);
  });

  testRoute('axe scans representative authenticated modules @qa-db-axe', async ({ page, observed }, testInfo) => {
    const results = [];
    const screens = modulePages(qaConfig.authenticatedPages.filter((item) => ['dashboard', 'products', 'inventory', 'pos', 'reservations', 'returns'].includes(item.id)));
    if (!screens.length) test.skip(true, `No axe screens are registered for module ${process.env.QA_MODULE}.`);
    for (const screen of screens) {
      await openPage(page, screen.path, observed);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      results.push({ route: screen.path, violations: axe.violations.map((violation) => ({ id: violation.id, impact: violation.impact, description: violation.description, helpUrl: violation.helpUrl, nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })) });
      if (axe.violations.length) {
        const root = path.resolve(process.env.QA_REPORT_DIR || 'test-results/qa-01'); await mkdir(path.join(root, 'screenshots', 'accessibility'), { recursive: true });
        await page.screenshot({ path: path.join(root, 'screenshots', 'accessibility', `${screen.id}-violations.png`), fullPage: true, animations: 'disabled' });
      }
    }
    const root = path.resolve(process.env.QA_REPORT_DIR || 'test-results/qa-01'); await mkdir(path.join(root, 'accessibility'), { recursive: true });
    const secrets = [process.env.QA_DATABASE_URL, process.env.E2E_ADMIN_PASSWORD].filter((value): value is string => Boolean(value));
    await writeFile(path.join(root, 'accessibility', 'authenticated-axe-findings.json'), sanitize(JSON.stringify(results, null, 2), secrets));
    const blocking = results.flatMap((result) => result.violations).filter((violation) => qaConfig.thresholds.accessibilityFailImpacts.includes(violation.impact as 'critical' | 'serious'));
    await persistEvents(observed, testInfo);
    expect(blocking, 'axe serious/critical violations in authenticated modules').toEqual([]);
  });

  testRoute('catalog and dashboard APIs are measured against bounded samples @qa-db-performance', async ({ page }, testInfo) => {
    const includeProducts = !process.env.QA_MODULE || process.env.QA_MODULE === 'products';
    if (includeProducts && process.env.QA_PERF_FIXTURE_READY !== '1') test.skip(true, 'BLOCKED: 10k-product QA performance fixture was not prepared.');
    const routes = process.env.QA_MODULE === 'products' ? ['/api/products?page=1&limit=48'] : process.env.QA_MODULE === 'dashboard' ? ['/api/dashboard'] : ['/api/products?page=1&limit=48', '/api/dashboard'];
    const samples: Array<{ path: string; status: number; durationMs: number }> = [];
    for (const route of routes) {
      const url = route.startsWith('/api/products') ? `${route}&q=QA-LAB-PERF` : route;
      const first = await page.request.get(url); expect(first.ok(), `${route} warm-up`).toBeTruthy();
      if (route.startsWith('/api/products')) expect((await first.json()).total).toBe(10_000);
      for (let sample = 0; sample < 5; sample += 1) {
        const started = performance.now(); const response = await page.request.get(url); const durationMs = performance.now() - started;
        if (route.startsWith('/api/products')) {
          const payload = await response.json();
          expect(payload.total).toBe(10_000);
          expect(payload.items).toHaveLength(48);
        }
        samples.push({ path: route.split('?')[0], status: response.status(), durationMs });
        expect(response.ok(), `${route} sample ${sample + 1}`).toBeTruthy();
      }
    }
    const byRoute = routes.map((route) => {
      const key = route.split('?')[0]; const sorted = samples.filter((sample) => sample.path === key).map((sample) => sample.durationMs).sort((a, b) => a - b);
      return { route: key, samples: sorted.length, p50Ms: Math.round(sorted[2]), p95Ms: Math.round(sorted[4]), thresholdMs: qaConfig.thresholds.publicApiP95Ms };
    });
    const root = path.resolve(process.env.QA_REPORT_DIR || 'test-results/qa-01'); await mkdir(path.join(root, 'performance'), { recursive: true });
    await writeFile(path.join(root, 'performance', 'authenticated-api-samples.json'), JSON.stringify({ samples, summary: byRoute }, null, 2));
    for (const metric of byRoute) testInfo.annotations.push({ type: 'api-performance', description: `${metric.route}: p50=${metric.p50Ms}ms p95=${metric.p95Ms}ms n=${metric.samples}` });
    expect(byRoute.every((metric) => metric.p95Ms < metric.thresholdMs), 'selected authenticated API p95 thresholds').toBe(true);
  });
});
