import { request, expect, type FullConfig } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { requirePasswords } from '../../scripts/e2e/database';
import { ids } from '../../scripts/e2e/seed';

const credentials = {
  admin: { email: 'dev-test-01-admin@invalid.test', password: requirePasswords().admin },
  seller: { email: 'dev-test-01-seller@invalid.test', password: requirePasswords().seller },
  inventory: { email: 'dev-test-01-inventory@invalid.test', password: requirePasswords().inventory },
};

export default async function setup(config: FullConfig) {
  const baseURL = String(config.projects[0].use.baseURL ?? 'http://127.0.0.1:3101');
  const authDirectory = path.resolve('playwright/.auth');
  await fs.mkdir(authDirectory, { recursive: true, mode: 0o700 });
  const authDirectoryInfo = await fs.lstat(authDirectory);
  if (authDirectoryInfo.isSymbolicLink() || !authDirectoryInfo.isDirectory()) throw new Error('Refusing to write browser storage state outside the private auth directory.');
  await fs.chmod(authDirectory, 0o700);

  const sessions = [
    { name: 'admin-centro', credential: credentials.admin, businessId: ids.centro, role: 'admin' },
    { name: 'admin-isolation', credential: credentials.admin, businessId: ids.centro, role: 'admin' },
    { name: 'admin-norte', credential: credentials.admin, businessId: ids.norte, role: 'admin' },
    { name: 'seller', credential: credentials.seller, businessId: ids.centro, role: 'seller' },
    { name: 'inventory', credential: credentials.inventory, businessId: ids.centro, role: 'inventory' },
  ] as const;

  for (const session of sessions) {
    const context = await request.newContext({ baseURL });
    const login = await context.post('/api/auth/login', { data: { email: session.credential.email, password: session.credential.password } });
    expect(login.status(), `${session.name} login must be real and successful`).toBe(200);
    const body = await login.json();
    expect(body.user.email).toBe(session.credential.email);
    expect(Array.isArray(body.businesses)).toBeTruthy();
    expect(body.redirect).toBe(session.role === 'admin' ? '/negocios' : '/dashboard');
    const select = await context.post('/api/businesses/select', { data: { businessId: session.businessId } });
    expect(select.status()).toBe(200);
    expect(await select.json()).toEqual({ redirect: '/dashboard' });
    const businesses = await context.get('/api/businesses');
    expect(businesses.status()).toBe(200);
    expect((await businesses.json()).activeBusinessId).toBe(session.businessId);
    const storageState = path.resolve(`playwright/.auth/${session.name}.json`);
    await context.storageState({ path: storageState });
    await fs.chmod(storageState, 0o600);
    await context.dispose();
  }
}
