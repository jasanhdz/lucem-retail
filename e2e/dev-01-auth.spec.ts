import { expect, test } from '@playwright/test';

test('login validates locally, posts the existing contract once and follows the response', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/auth/login', async route => {
    requests += 1;
    await new Promise(resolve => setTimeout(resolve, 150));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ redirect: '/negocios' }) });
  });
  await page.goto('/login');
  const email = page.getByLabel('Correo electrónico');
  const password = page.getByRole('textbox', { name: 'Contraseña' });
  await page.getByRole('button', { name: /Iniciar sesión/ }).click();
  await expect(email).toHaveAttribute('required', '');
  await expect(password).toHaveAttribute('required', '');
  expect(requests).toBe(0);
  await email.fill('correo-no-valido');
  await password.fill('entrada');
  await page.getByRole('button', { name: /Iniciar sesión/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(requests).toBe(0);
  await email.fill('persona@tienda.test');
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: /Iniciar sesión/ }).click();
  await expect(page).toHaveURL(/\/negocios$/);
  expect(requests).toBe(1);
});

test('login shows recoverable server errors and permits retry', async ({ page }) => {
  let attempts = 0;
  const requestedPaths: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/dashboard') requestedPaths.push(url.pathname);
  });
  await page.route('**/api/auth/login', async route => {
    attempts += 1;
    if (attempts === 1) await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'No se pudo validar el acceso.' }) });
    else if (attempts === 2) await route.abort('failed');
    else await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ redirect: '/dashboard' }) });
  });
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill('persona@tienda.test');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('entrada');
  await page.getByRole('button', { name: /Iniciar sesión/ }).click();
  await expect(page.locator('.error-message')).toContainText('No se pudo validar');
  await page.getByRole('button', { name: /Iniciar sesión/ }).click();
  await expect(page.locator('.error-message')).toBeVisible();
  await page.getByRole('button', { name: /Iniciar sesión/ }).click();
  await expect.poll(() => requestedPaths).toContain('/dashboard');
  expect(attempts).toBe(3);
});

test('business selection supports loading, empty and recoverable errors without creation', async ({ page }) => {
  let mode: 'error' | 'network' | 'empty' | 'list' = 'error';
  await page.route('**/api/businesses', async route => {
    if (mode === 'error') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Servicio temporalmente no disponible.' }) });
    else if (mode === 'network') await route.abort('failed');
    else await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ businesses: mode === 'empty' ? [] : [{ id: 'business-a', name: 'Tienda Centro', role: 'ADMIN' }, { id: 'business-b', name: 'Sucursal Norte', role: 'STAFF' }] }) });
  });
  await page.goto('/negocios');
  await expect(page.locator('.error-message')).toContainText('Servicio temporalmente no disponible');
  mode = 'network';
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.locator('.error-message')).toBeVisible();
  mode = 'empty';
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { name: /Aún no tienes negocios registrados/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Crear mi primer negocio/ })).toBeVisible();
  mode = 'list';
  await page.reload();
  await expect(page.getByRole('radio', { name: /Tienda Centro/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Sucursal Norte/ })).toBeVisible();
});

test('business confirmation posts the selected id exactly and follows the server redirect', async ({ page }) => {
  let payload: unknown;
  const requestedPaths: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/dashboard') requestedPaths.push(url.pathname);
  });
  await page.route('**/api/businesses', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ activeBusinessId: 'business-a', businesses: [{ id: 'business-a', name: 'Tienda Centro', role: 'ADMIN' }, { id: 'business-b', name: 'Sucursal Norte', role: 'STAFF' }] }) }));
  await page.route('**/api/businesses/select', async route => {
    payload = route.request().postDataJSON();
    await new Promise(resolve => setTimeout(resolve, 150));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ redirect: '/dashboard' }) });
  });
  await page.goto('/negocios');
  await page.getByRole('radio', { name: /Sucursal Norte/ }).click();
  await page.getByRole('button', { name: /Continuar/ }).click();
  await expect.poll(() => requestedPaths).toContain('/dashboard');
  expect(payload).toEqual({ businessId: 'business-b' });
});

test('registration confirmation is generic, requires explicit login, then continues through business details and giro', async ({ page }) => {
  let businessPayload: Record<string, unknown> | undefined;
  let businessCookie = '';
  await page.route('**/api/auth/register', route => route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ message: 'Registro recibido. Inicia sesión para continuar.' }) }));
  await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Set-Cookie': 'lucem_session=login-session; Path=/; HttpOnly; SameSite=Lax' }, body: JSON.stringify({ user: { name: 'Sofía Morales', email: 'sofia@example.test' }, businesses: [], redirect: '/negocios/crear' }) }));
  await page.route('**/api/businesses', async route => {
    if (route.request().method() === 'POST') {
      businessPayload = route.request().postDataJSON();
      businessCookie = route.request().headers().cookie || '';
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ business: { id: 'business-new', name: 'Tienda de prueba', branchName: 'Matriz', giro: 'papeleria' }, redirect: '/negocios/confirmacion' }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ activeBusinessId: 'business-new', businesses: [{ id: 'business-new', name: 'Tienda de prueba', branchName: 'Matriz', giro: 'papeleria' }] }) });
    }
  });
  await page.goto('/registro');
  await page.getByLabel('Nombre completo').fill('Sofía Morales');
  await page.getByLabel('Correo electrónico').fill('sofia@example.test');
  await page.locator('#register-password').fill('LucemTest!2026');
  await page.getByLabel('Confirmar contraseña').fill('LucemTest!2026');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status')).toHaveText('Registro recibido. Inicia sesión para continuar.');
  await page.getByLabel('Correo electrónico').fill('sofia@example.test');
  await page.locator('#password').fill('LucemTest!2026');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/negocios\/crear$/);
  await expect(page.locator('#business-giro')).toHaveCount(0);
  const layout = await page.evaluate(() => ({ descriptionTop: document.querySelector('#business-description')?.getBoundingClientRect().top ?? 0, timezoneTop: document.querySelector('#business-timezone')?.getBoundingClientRect().top ?? 0, namePadding: Number.parseFloat(getComputedStyle(document.querySelector('#business-name') as HTMLInputElement).paddingLeft) }));
  expect(layout.descriptionTop).toBeGreaterThan(layout.timezoneTop);
  expect(layout.namePadding).toBeGreaterThanOrEqual(46);
  await page.getByLabel('Nombre del negocio').fill('Tienda de prueba');
  await page.getByLabel(/Nombre de la sucursal principal/).fill('Matriz');
  await page.getByLabel('País de operación').selectOption('CO');
  await page.getByLabel('Moneda base').selectOption('USD');
  await page.getByLabel('Zona horaria').selectOption('America/Bogota');
  await page.getByLabel(/Descripción corta/).fill('Tienda de prueba');
  await expect(page.getByText('16 / 180')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(/\/negocios\/giro$/);
  const businessDraft = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lucem_onboarding_draft') || '{}'));
  expect(businessDraft).toMatchObject({ country: 'CO', currency: 'USD', timezone: 'America/Bogota', description: 'Tienda de prueba' });
  await page.getByRole('radio', { name: /Papelería y oficina/ }).click();
  await page.getByRole('button', { name: /Finalizar configuración/ }).click();
  await expect(page).toHaveURL(/\/negocios\/confirmacion$/);
  await expect(page.getByRole('heading', { name: 'Tienda de prueba' })).toBeVisible();
  expect(businessPayload).toMatchObject({ name: 'Tienda de prueba', branchName: 'Matriz', giro: 'papeleria' });
  expect(businessCookie).toContain('lucem_session=login-session');
});

test('profile skip advances without requiring profile fields', async ({ page }) => {
  await page.goto('/perfil');
  await page.getByRole('button', { name: /Omitir por ahora/ }).click();
  await expect(page).toHaveURL(/\/negocios\/crear$/);
  await expect(page.getByRole('heading', { name: 'Crea tu primer negocio' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('lucem_onboarding_profile') || '{}').skipped)).toBe(true);
});

test('auth pages remain usable without horizontal scrolling at mobile and tablet widths', async ({ page }) => {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/login', '/negocios']) {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
});

test('login controls expose visible keyboard focus in tab order', async ({ page }) => {
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeFocused();
  const focusStyle = await page.getByRole('textbox', { name: 'Contraseña' }).evaluate(element => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle).toEqual({ outlineStyle: 'solid', outlineWidth: '3px' });
});
