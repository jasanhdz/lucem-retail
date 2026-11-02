import { expect, request as playwrightRequest, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
const normalSku = 'DEV-TEST-01-NORMAL';

async function inventoryRow(request: { get: (url: string) => Promise<any> }, sku = normalSku) { return (await (await request.get('/api/inventory')).json()).find((row: { sku: string }) => row.sku === sku); }
async function createSale(page: any, variantId: string, quantity = 1, suffix = 'sale') { const response = await page.request.post('/api/sales', { data: { items: [{ variantId, quantity }], paymentMethod: 'CARD', idempotencyKey: `DEV-07-${suffix}-${Date.now()}` } }); expect(response.status()).toBe(201); const created = await response.json(); return (await (await page.request.get(`/api/sales/${created.id}`)).json()); }

test.describe('DEV-07 devoluciones', () => {
  test('lists returns and performs partial, remainder and over-return checks with persisted stock', async ({ page }) => {
    const request = page.request; const initial = await inventoryRow(request); const sale = (await (await request.get('/api/sales?search=901')).json())[0];
    expect(sale.folio).toBe(901); expect((await request.get('/api/returns?search=901')).status()).toBe(200);
    const line = sale.lines.find((item: { variant: { sku: string } }) => item.variant.sku === normalSku); const before = await inventoryRow(request);
    const partial = await request.post('/api/returns', { data: { confirmation: true, saleId: sale.id, reason: 'DEV-07 parcial', refundAmount: 100, idempotencyKey: 'DEV-07-partial-901', items: [{ saleLineId: line.id, quantity: 1 }] } });
    expect(partial.status()).toBe(201); const held = await inventoryRow(request); expect(Number(held.available)).toBe(Number(before.available) + 1);
    const remainder = await request.post('/api/returns', { data: { confirmation: true, saleId: sale.id, reason: 'DEV-07 resto', refundAmount: 100, idempotencyKey: 'DEV-07-remainder-901', items: [{ saleLineId: line.id, quantity: 1 }] } });
    expect(remainder.status()).toBe(201); const complete = await inventoryRow(request); expect(Number(complete.available)).toBe(Number(before.available) + 2);
    const over = await request.post('/api/returns', { data: { confirmation: true, saleId: sale.id, reason: 'DEV-07 sobre', refundAmount: 100, idempotencyKey: 'DEV-07-over-901', items: [{ saleLineId: line.id, quantity: 1 }] } });
    expect(over.status()).toBe(400); expect(Number((await inventoryRow(request)).available)).toBe(Number(complete.available)); expect(Number(initial.physical)).toBe(Number(initial.available) + Number(initial.reserved));
  });

  test('enforces exact refund, reason and duplicate-line validation', async ({ page }) => {
    const sale = (await (await page.request.get('/api/sales?search=902')).json())[0]; const line = sale.lines[0];
    for (const [key, refund] of [['negative', -1], ['over', 51], ['under', 49], ['fraction-cent', 50.0005]]) { const response = await page.request.post('/api/returns', { data: { confirmation: true, saleId: sale.id, reason: `DEV-07-${key}`, refundAmount: refund, idempotencyKey: `DEV-07-${key}-902`, items: [{ saleLineId: line.id, quantity: 1 }] } }); expect(response.status()).toBe(400); }
    const noReason = await page.request.post('/api/returns', { data: { confirmation: true, saleId: sale.id, refundAmount: 50, idempotencyKey: 'DEV-07-no-reason', items: [{ saleLineId: line.id, quantity: 1 }] } }); expect(noReason.status()).toBe(400);
    const duplicateLine = await page.request.post('/api/returns', { data: { confirmation: true, saleId: sale.id, reason: 'DEV-07 duplicate', refundAmount: 50, idempotencyKey: 'DEV-07-duplicate-line', items: [{ saleLineId: line.id, quantity: 1 }, { saleLineId: line.id, quantity: 1 }] } }); expect(duplicateLine.status()).toBe(400);
  });

  test('replays one idempotent return and records one RETURN Kardex movement', async ({ page }) => {
    const variant = (await (await page.request.get('/api/products?available=true&q=DEV-TEST-01-LOW')).json())[0]; const sale = await createSale(page, variant.id, 1, 'idempotent'); const before = await inventoryRow(page.request, 'DEV-TEST-01-LOW'); const body = { confirmation: true, saleId: sale.id, reason: 'DEV-07 idempotent', refundAmount: 50, idempotencyKey: 'DEV-07-idempotent-return', items: [{ saleLineId: sale.lines[0].id, quantity: 1 }] };
    const first = await page.request.post('/api/returns', { data: body }); expect(first.status()).toBe(201); const replay = await page.request.post('/api/returns', { data: body }); expect(replay.status()).toBe(200); expect((await replay.json()).id).toBe((await first.json()).id);
    const after = await inventoryRow(page.request, 'DEV-TEST-01-LOW'); expect(Number(after.available)).toBe(Number(before.available) + 1); const movements = await page.request.get(`/api/inventory/movements?variantId=${variant.id}&q=DEV-07%20idempotent&pageSize=20`); expect((await movements.json()).items.filter((item: { type: string }) => item.type === 'RETURN')).toHaveLength(1);
  });

  test('serializes concurrent returns and handles an Apartados-converted sale', async ({ page }) => {
    const variant = (await (await page.request.get(`/api/products?available=true&q=${normalSku}`)).json())[0]; const sale = await createSale(page, variant.id, 1, 'concurrent'); const body = { confirmation: true, saleId: sale.id, reason: 'DEV-07 concurrent', refundAmount: 100, idempotencyKey: 'DEV-07-concurrent-return', items: [{ saleLineId: sale.lines[0].id, quantity: 1 }] };
    const responses = await Promise.all([page.request.post('/api/returns', { data: body }), page.request.post('/api/returns', { data: body })]); expect(responses.filter((response) => response.status() === 201)).toHaveLength(1); expect(responses.every((response) => [200, 201, 409].includes(response.status()))).toBeTruthy();
    const reservation = await page.request.post('/api/reservations', { data: { variantId: variant.id, quantity: 1, expiresAt: new Date(Date.now() + 86400000).toISOString(), notes: 'DEV-07 apartado sale' } }); expect(reservation.status()).toBe(201); const reservationId = (await reservation.json()).id; const converted = await page.request.post(`/api/reservations/${reservationId}/convert`, { data: { confirmation: true, paymentMethod: 'CARD' } }); expect(converted.status()).toBe(200); const convertedSale = await converted.json(); const returnResponse = await page.request.post('/api/returns', { data: { confirmation: true, saleId: convertedSale.saleId, reason: 'DEV-07 apartado return', refundAmount: 100, idempotencyKey: 'DEV-07-apartado-return', items: [{ saleLineId: (await (await page.request.get(`/api/sales/${convertedSale.saleId}`)).json()).lines[0].id, quantity: 1 }] } }); expect(returnResponse.status()).toBe(201); const reservations = await page.request.get('/api/reservations'); expect((await reservations.json()).find((row: { id: string }) => row.id === reservationId).status).toBe('CONVERTED');
  });

  test('validates roles, isolation and responsive return workflow', async ({ page, browser }) => {
    const variant = (await (await page.request.get('/api/products?available=true&q=DEV-TEST-01-NORMAL')).json())[0]; const sale = await createSale(page, variant.id, 1, 'visual');
    await page.goto('/devoluciones'); await expect(page.getByRole('heading', { name: 'Devoluciones', exact: true })).toBeVisible(); await page.getByRole('textbox', { name: 'Buscar por folio o ID de venta' }).fill(String(sale.folio)); await page.getByRole('button', { name: 'Buscar venta' }).click(); await expect(page.getByText(`Folio #${sale.folio}`)).toBeVisible(); await page.getByRole('button', { name: `Folio #${sale.folio}` }).click(); await expect(page.getByText('Artículos vendidos')).toBeVisible();
    for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } })) { await page.setViewportSize(viewport); await expect.poll(() => page.locator('.returns-page').evaluate((element) => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth + 1 && getComputedStyle(element).overflowX === 'hidden'; })).toBeTruthy(); await page.screenshot({ path: test.info().outputPath(`returns-${name}.png`), fullPage: false }); }
    const seller = await browser.newContext({ storageState: 'playwright/.auth/seller.json' }); const sellerPage = await seller.newPage(); await sellerPage.goto('/devoluciones'); await expect(sellerPage.getByRole('heading', { name: 'Devoluciones', exact: true })).toBeVisible(); await expect(sellerPage.getByRole('button', { name: 'Confirmar devolución' })).toHaveCount(0); expect((await seller.request.get('/api/returns')).status()).toBe(200); expect((await seller.request.post('/api/returns', { data: { confirmation: true, saleId: sale.id, reason: 'DEV-07 seller', refundAmount: 100, idempotencyKey: 'DEV-07-seller', items: [{ saleLineId: sale.lines[0].id, quantity: 1 }] } })).status()).toBe(403); await seller.close();
    const norte = await browser.newContext({ storageState: 'playwright/.auth/admin-norte.json' }); expect((await norte.request.get(`/api/sales/${sale.id}`)).status()).toBe(404); expect((await norte.request.get('/api/returns?search=901')).status()).toBe(200); await norte.close();
  });

  test('rejects anonymous access', async () => { const anonymous = await playwrightRequest.newContext({ baseURL: 'http://127.0.0.1:3107', storageState: { cookies: [], origins: [] } }); expect((await anonymous.get('/api/returns')).status()).toBe(401); expect((await anonymous.get('/api/sales')).status()).toBe(401); await anonymous.dispose(); });
});
