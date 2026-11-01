import { test, expect } from '@playwright/test';

const realDashboard = { gross: '250.00', net: '250.00', units: 3, cogs: '100.00', profit: '150.00', outOfStock: 1, lowStock: 1, recent: [{ id: 'fixture-sale', folio: 901, total: '200.00', status: 'CONFIRMED', createdAt: new Date().toISOString() }] };
test.use({ storageState: 'playwright/.auth/admin.json' });

test('pending dashboard fixture shows skeleton without invented zeros', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/dashboard', async route => { await pending; await route.continue(); });
  await page.goto('/dashboard');
  await expect(page.getByRole('status', { name: 'Cargando resumen operativo' })).toBeVisible();
  await expect(page.getByText('Ventas netas')).toHaveCount(0);
  release();
  await expect(page.getByText('$250.00').first()).toBeVisible();
});

test('empty dashboard fixture is explicit and does not stand in for auth or data', async ({ page }) => {
  await page.route('**/api/dashboard', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ gross: '0.00', net: '0.00', units: 0, cogs: '0.00', profit: '0.00', outOfStock: 0, lowStock: 0, recent: [] }) }));
  await page.goto('/dashboard');
  await expect(page.getByRole('status').getByText('Tu operación comienza aquí')).toBeVisible();
  await expect(page.getByText('Aún no hay ventas registradas en este periodo.')).toBeVisible();
});

test('dashboard error fixture retries the real response', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/dashboard', route => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'fixture unavailable' }) })
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(realDashboard) });
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByText('$250.00').first()).toBeVisible();
  expect(attempts).toBe(2);
});
