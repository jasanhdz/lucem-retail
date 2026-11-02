import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const email = `dev08-${Date.now()}@dev08.invalid.test`;
const password = 'LucemDev08!Strong';
const viewports = [[1440, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'mobile']] as const;
async function capture(page: import('@playwright/test').Page, screen: string) {
  for (const [width, height, label] of viewports) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `docs/ui-redesign/dev-08-visual-evidence/${screen}-${label}.png`, fullPage: true });
  }
}

test('completa registro, primer negocio y giro con datos persistidos', async ({ page }) => {
  await page.goto('/registro');
  await capture(page, 'registro');
  await page.getByLabel('Nombre completo').fill('DEV-08 Onboarding');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('#register-password').fill(password);
  await page.getByLabel('Confirmar contraseña').fill(password);
  await page.getByRole('checkbox').check();
  const registerResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/auth/register'));
  await page.getByRole('button', { name: 'Continuar' }).click();
  const registerResponse = await registerResponsePromise;
  expect(registerResponse.status()).toBe(201);
  const registerBody = await registerResponse.json();
  expect(registerBody.user.passwordHash).toBeUndefined();
  expect(registerBody.user.email).toBe(email);
  const sessionCookie = (await page.context().cookies()).find(cookie => cookie.name === 'lucem_session');
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.sameSite).toBe('Lax');
  await expect(page).toHaveURL(/\/negocios\/crear$/);
  await capture(page, 'crear-negocio');
  await page.getByLabel('Nombre del negocio').fill('DEV-08 Primera Tienda');
  await page.getByLabel(/Sucursal principal/).fill('Matriz DEV-08');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(/\/negocios\/giro$/);
  await capture(page, 'seleccionar-giro');
  await page.getByRole('radio', { name: /Papelería y oficina/ }).click();
  const creationKey = await page.evaluate(() => sessionStorage.getItem('lucem_onboarding_creation_key'));
  await page.getByRole('button', { name: 'Crear negocio' }).click();
  await expect(page).toHaveURL(/\/negocios\/confirmacion$/);
  await expect(page.getByRole('heading', { name: /Todo listo/ })).toBeVisible();
  await expect(page.getByText('DEV-08 Primera Tienda', { exact: true })).toBeVisible();
  await capture(page, 'confirmacion');
  const replay = await page.evaluate(async (key) => { const response = await fetch('/api/businesses', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key || '' }, body: JSON.stringify({ name: 'DEV-08 Primera Tienda', branchName: 'Matriz DEV-08', giro: 'papeleria', idempotencyKey: key }) }); return { status: response.status, body: await response.json() }; }, creationKey);
  expect(replay.status).toBe(201);
  expect(replay.body.business.name).toBe('DEV-08 Primera Tienda');
  await page.getByRole('button', { name: /Ir al dashboard/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.request.post('/api/auth/logout');
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('button', { name: 'DEV-08 Primera Tienda' })).toBeVisible();
  await capture(page, 'dashboard');
  const duplicate = await page.request.post('/api/auth/register', { data: { name: 'DEV-08 Duplicate', email, password, confirmation: password, terms: true } });
  expect(duplicate.status()).toBe(409);
  const invalid = await page.request.post('/api/auth/register', { data: { name: 'X', email: 'invalid', password: 'short', confirmation: 'different', terms: false } });
  expect(invalid.status()).toBe(400);

  const db = new PrismaClient();
  try {
    const user = await db.user.findUnique({ where: { email }, include: { memberships: { include: { business: true } } } });
    expect(user?.memberships).toHaveLength(1);
    expect(user?.passwordHash).not.toBe(password);
    expect(user?.memberships[0].role).toBe('ADMIN');
    expect(user?.memberships[0].business.giro).toBe('PAPELERIA');
    expect(user?.memberships[0].business.branchName).toBe('Matriz DEV-08');
  } finally { await db.$disconnect(); }
});
