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
  await fs.mkdir(path.resolve('playwright/.auth'), { recursive: true });
  for (const [role, credential] of Object.entries(credentials)) {
    const context = await request.newContext({ baseURL });
    const login = await context.post('/api/auth/login', { data: { email: credential.email, password: credential.password } });
    expect(login.status(), `${role} login must be real and successful`).toBe(200);
    const body = await login.json();
    expect(body.user.email).toBe(credential.email);
    expect(Array.isArray(body.businesses)).toBeTruthy();
    expect(body.redirect).toBe(role === 'admin' ? '/negocios' : '/dashboard');
    const select = await context.post('/api/businesses/select', { data: { businessId: ids.centro } });
    expect(select.status()).toBe(200);
    expect(await select.json()).toEqual({ redirect: '/dashboard' });
    const businesses = await context.get('/api/businesses');
    expect(businesses.status()).toBe(200);
    expect((await businesses.json()).activeBusinessId).toBe(ids.centro);
    await context.storageState({ path: path.resolve(`playwright/.auth/${role}.json`) });
    await context.dispose();
  }
}
