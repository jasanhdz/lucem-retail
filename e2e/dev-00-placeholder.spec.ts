import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('public placeholder routes share exact content', async ({ page }) => {
  for (const route of ['/', '/login', '/negocios']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: 'Lucem Retail' })).toBeVisible();
    await expect(page.getByText('Estamos preparando la nueva interfaz.', { exact: true })).toBeVisible();
  }
});

test('protected workspace redirects without authentication', async ({ page, request }) => {
  for (const route of ['/dashboard', '/pos', '/productos', '/inventario', '/apartados', '/devoluciones', '/reportes', '/auditoria', '/tickets/DEV00-nonexistent']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login/);
  }
});

test('all placeholder route modules use the shared component and ticket preserves auth scoping', async () => {
  const modules = [
    'app/page.tsx',
    'app/(auth)/login/page.tsx',
    'app/(auth)/negocios/page.tsx',
    'app/(workspace)/dashboard/page.tsx',
    'app/(workspace)/pos/page.tsx',
    'app/(workspace)/productos/page.tsx',
    'app/(workspace)/inventario/page.tsx',
    'app/(workspace)/apartados/page.tsx',
    'app/(workspace)/devoluciones/page.tsx',
    'app/(workspace)/reportes/page.tsx',
    'app/(workspace)/auditoria/page.tsx',
    'app/tickets/[id]/page.tsx',
  ];
  for (const module of modules) {
    const source = readFileSync(resolve(process.cwd(), module), 'utf8');
    expect(source, module).toMatch(/import\s*\{\s*PreparationPlaceholder\s*\}\s*from\s*['"]@\/components\/PreparationPlaceholder['"]/);
    expect(source, module).toMatch(/return\s*<PreparationPlaceholder\s*\/>|export\s+default\s+PreparationPlaceholder/);
  }

  const ticket = readFileSync(resolve(process.cwd(), 'app/tickets/[id]/page.tsx'), 'utf8');
  expect(ticket).toMatch(/getAuth\s*\(/);
  expect(ticket).toMatch(/findFirst\s*\(\s*\{[\s\S]*?businessId\s*:\s*auth\.business\.id/);
  expect(ticket).toMatch(/notFound\s*\(/);
});

test('protected API handlers reject requests without cookies', async ({ request }) => {
  const requests: Array<{ method: 'GET' | 'POST' | 'PUT' | 'DELETE'; endpoint: string }> = [
    { method: 'GET', endpoint: '/api/businesses' }, { method: 'POST', endpoint: '/api/businesses/select' },
    { method: 'GET', endpoint: '/api/categories' },
    { method: 'GET', endpoint: '/api/products' }, { method: 'POST', endpoint: '/api/products' },
    { method: 'GET', endpoint: '/api/products/DEV00-nonexistent' }, { method: 'PUT', endpoint: '/api/products/DEV00-nonexistent' }, { method: 'DELETE', endpoint: '/api/products/DEV00-nonexistent' },
    { method: 'GET', endpoint: '/api/products/DEV00-nonexistent/history' }, { method: 'POST', endpoint: '/api/products/image' }, { method: 'GET', endpoint: '/api/products/image/DEV00-nonexistent' },
    { method: 'GET', endpoint: '/api/inventory' }, { method: 'POST', endpoint: '/api/inventory' }, { method: 'POST', endpoint: '/api/inventory/movements' },
    { method: 'GET', endpoint: '/api/reservations' }, { method: 'POST', endpoint: '/api/reservations' },
    { method: 'POST', endpoint: '/api/reservations/DEV00-nonexistent' }, { method: 'POST', endpoint: '/api/reservations/DEV00-nonexistent/release' },
    { method: 'POST', endpoint: '/api/reservations/DEV00-nonexistent/convert' }, { method: 'POST', endpoint: '/api/reservations/expire' },
    { method: 'GET', endpoint: '/api/sales' }, { method: 'POST', endpoint: '/api/sales' }, { method: 'GET', endpoint: '/api/sales/DEV00-nonexistent' },
    { method: 'POST', endpoint: '/api/sales/DEV00-nonexistent/cancel' }, { method: 'GET', endpoint: '/api/returns' }, { method: 'POST', endpoint: '/api/returns' },
    { method: 'GET', endpoint: '/api/dashboard' }, { method: 'GET', endpoint: '/api/reports/sales' },
    { method: 'GET', endpoint: '/api/reports/export.csv' }, { method: 'GET', endpoint: '/api/reports/export.xlsx' }, { method: 'GET', endpoint: '/api/audit' },
  ];
  for (const { method, endpoint } of requests) {
    const response = await request.fetch(endpoint, { method });
    expect(response.status(), `${method} ${endpoint}`).toBe(401);
  }
});
