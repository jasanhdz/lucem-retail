import { expect, request, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe.configure({ mode: 'serial' });
const password = 'LucemDev09!Strong';
const email = `merchant-${Date.now()}@dev09.invalid.test`;
const viewports = [[1440, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'mobile']] as const;

async function body(response: import('@playwright/test').APIResponse) { return response.json(); }
async function capture(page: import('@playwright/test').Page, name: string) {
  for (const [width, height, label] of viewports) {
    await page.setViewportSize({ width, height });
    const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth, elements: [...document.querySelectorAll<HTMLElement>('*')].filter(element => element.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 20).map(element => { const style = getComputedStyle(element); const parent = element.parentElement; const rect = element.getBoundingClientRect(); return { tag: element.tagName, className: element.className, right: Math.round(rect.right), left: Math.round(rect.left), width: Math.round(rect.width), minWidth: style.minWidth, flex: style.flex, overflowX: style.overflowX, parentClass: parent?.className ?? '', parentWidth: parent ? Math.round(parent.getBoundingClientRect().width) : null }; }) }));
    expect(overflow.width <= overflow.viewport, `${name} overflows at ${width}x${height}: ${JSON.stringify(overflow)}`).toBeTruthy();
    await page.screenshot({ path: `docs/testing/dev-09-visual-evidence/${name}-${label}.png`, fullPage: false });
  }
}

test('merchant completes authenticated commercial journey with persisted balances', async ({ page }) => {
  const api = await request.newContext({ baseURL: 'http://127.0.0.1:3109' });
  const db = new PrismaClient();
  try {
    const registered = await api.post('/api/auth/register', { data: { name: 'DEV-09 Merchant', email, password, confirmation: password, terms: true } });
    expect(registered.status()).toBe(201);
    expect((await body(await api.get('/api/businesses'))).businesses).toHaveLength(0);

    const createdBusiness = await api.post('/api/businesses', { headers: { 'Idempotency-Key': 'dev09-business-create' }, data: { name: 'DEV-09 Comercio', branchName: 'Matriz DEV-09', giro: 'ropa' } });
    expect(createdBusiness.status()).toBe(201);
    const business = (await body(createdBusiness)).business;
    expect((await body(await api.get('/api/businesses'))).activeBusinessId).toBe(business.id);
    const categories = await body(await api.get('/api/categories'));
    expect(categories).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'General' })]));
    const categoryId = categories.find((category: { name: string }) => category.name === 'General').id;

    const simpleResponse = await api.post('/api/products', { data: { name: 'DEV-09 Simple', categoryId, location: 'Matriz', variants: [{ sku: 'DEV09-SIMPLE', cost: 40, price: 100, stock: 10, lowStockThreshold: 2 }] } });
    const multiResponse = await api.post('/api/products', { data: { name: 'DEV-09 Variantes', categoryId, location: 'Matriz', variants: [{ sku: 'DEV09-VAR-A', size: 'M', cost: 20, price: 60, stock: 5 }, { sku: 'DEV09-VAR-B', size: 'L', cost: 20, price: 60, stock: 3 }] } });
    expect(simpleResponse.status()).toBe(201); expect(multiResponse.status()).toBe(201);
    const simple = await body(simpleResponse); const multi = await body(multiResponse);
    const simpleId = (await body(await api.get('/api/products?q=DEV09-SIMPLE')))[0].id;
    const variantA = (await body(await api.get('/api/products?q=DEV09-VAR-A')))[0];
    const variantB = (await body(await api.get('/api/products?q=DEV09-VAR-B')))[0];
    expect(simpleId).toBe(simple.variants?.[0]?.id ?? simpleId);
    expect(multi.id).toEqual(expect.any(String));

    const initialInventory = await body(await api.get('/api/inventory'));
    const simpleInventory = initialInventory.find((row: { sku: string }) => row.sku === 'DEV09-SIMPLE');
    const variantAInventory = initialInventory.find((row: { sku: string }) => row.sku === 'DEV09-VAR-A');
    expect(Number(simpleInventory.physical)).toBe(10);
    expect(Number(variantAInventory.physical)).toBe(5);
    const purchase = await api.post('/api/inventory/movements', { data: { variantId: simpleInventory.id, type: 'PURCHASE', quantity: 2, reason: 'DEV-09 entrada' } });
    expect(purchase.status()).toBe(200);
    expect(Number((await body(purchase)).physical)).toBe(12);

    const saleResponse = await api.post('/api/sales', { data: { items: [{ variantId: simpleInventory.id, quantity: 2 }], paymentMethod: 'CASH', receivedAmount: 220, idempotencyKey: 'dev09-cash-sale' } });
    expect(saleResponse.status()).toBe(201);
    const sale = await body(saleResponse);
    const ticket = await api.get(`/api/sales/${sale.id}`);
    expect(ticket.status()).toBe(200); expect(Number((await body(ticket)).total)).toBe(200);
    const afterSale = (await body(await api.get('/api/inventory'))).find((row: { sku: string }) => row.sku === 'DEV09-SIMPLE');
    expect(Number(afterSale.available)).toBe(10);

    const heldBefore = (await body(await api.get('/api/inventory'))).find((row: { sku: string }) => row.sku === 'DEV09-VAR-A');
    const reservationResponse = await api.post('/api/reservations', { data: { variantId: variantA.id, quantity: 2, expiresAt: new Date(Date.now() + 86400000).toISOString(), customerName: 'DEV-09 Cliente', notes: 'DEV-09 apartado' } });
    expect(reservationResponse.status()).toBe(201);
    const reservation = await body(reservationResponse);
    const held = (await body(await api.get('/api/inventory'))).find((row: { sku: string }) => row.sku === 'DEV09-VAR-A');
    expect(Number(held.available)).toBe(Number(heldBefore.available) - 2);
    expect(Number(held.reserved)).toBe(Number(heldBefore.reserved) + 2);
    expect(Number(held.physical)).toBe(Number(heldBefore.physical));
    const converted = await api.post(`/api/reservations/${reservation.id}/convert`, { data: { confirmation: true, paymentMethod: 'CARD' } });
    expect(converted.status()).toBe(200);
    const convertedBody = await body(converted);
    const convertedReplay = await api.post(`/api/reservations/${reservation.id}/convert`, { data: { confirmation: true, paymentMethod: 'CARD' } });
    expect(convertedReplay.status()).toBe(200); expect((await body(convertedReplay)).saleId).toBe(convertedBody.saleId);
    const afterConvert = (await body(await api.get('/api/inventory'))).find((row: { sku: string }) => row.sku === 'DEV09-VAR-A');
    expect(Number(afterConvert.available)).toBe(Number(held.available));
    expect(Number(afterConvert.reserved)).toBe(0);
    expect(Number(afterConvert.physical)).toBe(Number(held.physical) - 2);

    const saleDetail = await body(await api.get(`/api/sales/${sale.id}`));
    const saleLine = saleDetail.lines[0];
    const returnBody = { confirmation: true, saleId: sale.id, reason: 'DEV-09 devolución parcial', refundAmount: 100, idempotencyKey: 'dev09-return', items: [{ saleLineId: saleLine.id, quantity: 1 }] };
    const returns = await Promise.all([api.post('/api/returns', { data: returnBody }), api.post('/api/returns', { data: returnBody })]);
    expect(returns.filter(response => response.status() === 201)).toHaveLength(1);
    expect(returns.every(response => [200, 201, 409].includes(response.status()))).toBeTruthy();
    const afterReturn = (await body(await api.get('/api/inventory'))).find((row: { sku: string }) => row.sku === 'DEV09-SIMPLE');
    expect(Number(afterReturn.available)).toBe(11);
    const movements = await body(await api.get(`/api/inventory/movements?variantId=${simpleInventory.id}&pageSize=100`));
    expect(movements.items.filter((item: { type: string; referenceType?: string }) => item.type === 'RETURN')).toHaveLength(1);

    const insufficient = await api.post('/api/sales', { data: { items: [{ variantId: simpleInventory.id, quantity: 999 }], paymentMethod: 'CASH', receivedAmount: 99999, idempotencyKey: 'dev09-insufficient' } });
    expect(insufficient.status()).toBe(409);
    const idempotentSaleBody = { items: [{ variantId: simpleInventory.id, quantity: 1 }], paymentMethod: 'CARD', idempotencyKey: 'dev09-sale-replay' };
    const saleReplay = await Promise.all([api.post('/api/sales', { data: idempotentSaleBody }), api.post('/api/sales', { data: idempotentSaleBody })]);
    expect(saleReplay.filter(response => response.status() === 201)).toHaveLength(1);
    expect(saleReplay.every(response => [200, 201, 409].includes(response.status()))).toBeTruthy();

    const concurrentInventory = await Promise.all([api.post('/api/inventory/movements', { data: { variantId: variantB.id, type: 'ADJUSTMENT_OUT', quantity: 2, reason: 'DEV-09 concurrent A' } }), api.post('/api/inventory/movements', { data: { variantId: variantB.id, type: 'ADJUSTMENT_OUT', quantity: 2, reason: 'DEV-09 concurrent B' } })]);
    expect(concurrentInventory.filter(response => response.status() === 200)).toHaveLength(1);
    expect(concurrentInventory.every(response => [200, 409].includes(response.status()))).toBeTruthy();

    const businessRows = await db.business.findUnique({ where: { id: business.id }, include: { memberships: true, products: { include: { variants: true } }, sales: { include: { lines: true } }, returns: { include: { lines: true } }, reservations: true } });
    expect(businessRows?.memberships).toHaveLength(1); expect(businessRows?.memberships[0].role).toBe('ADMIN');
    expect(businessRows?.products).toHaveLength(2); expect(businessRows?.sales.length).toBeGreaterThanOrEqual(3); expect(businessRows?.returns).toHaveLength(1);
    const dashboard = await body(await api.get('/api/dashboard?from=2020-01-01&to=2030-01-01'));
    expect(Number(dashboard.gross)).toBeGreaterThan(0); expect(Number(dashboard.net)).toBeLessThan(Number(dashboard.gross));

     await api.post('/api/auth/logout');
     await page.goto('/login');
     await page.getByLabel('Correo electrónico').fill(email); await page.locator('#password').fill(password);
     const loginResponse = page.waitForResponse(response => response.url().endsWith('/api/auth/login'));
     await page.getByRole('button', { name: 'Iniciar sesión' }).click();
     expect((await loginResponse).status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('button', { name: 'DEV-09 Comercio' })).toBeVisible();
    for (const [path, name] of [['/dashboard', 'dashboard'], ['/productos', 'productos'], ['/inventario', 'inventario'], ['/pos', 'pos'], ['/apartados', 'apartados'], ['/devoluciones', 'devoluciones'], [`/tickets/${sale.id}`, 'ticket']] as const) { await page.goto(path); await capture(page, name); }
  } finally { await api.dispose(); await db.$disconnect(); }
});
