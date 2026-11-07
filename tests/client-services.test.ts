import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerAccount, signIn } from '../src/services/auth';
import { createBusiness, getBusinesses, selectBusiness } from '../src/services/businesses';

afterEach(() => vi.unstubAllGlobals());
describe('client services', () => {
  it('preserves login request and response status', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect((await signIn('a@b.test', 'secret')).status).toBe(200);
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@b.test', password: 'secret' }) });
  });
  it('fetches businesses and posts selected business preserving statuses', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 401 })).mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect((await getBusinesses()).status).toBe(401);
    expect((await selectBusiness('biz')).status).toBe(200);
    expect(fetch.mock.calls).toEqual([
      ['/api/businesses', { credentials: 'include', cache: 'no-store' }],
      ['/api/businesses/select', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: 'biz' }) }],
    ]);
  });
  it('registers accounts and sends an idempotent business creation request', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 201 })).mockResolvedValueOnce(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    await registerAccount({ name: 'Sofia', email: 'sofia@test.local', password: 'strong-pass', confirmation: 'strong-pass', terms: true });
    await createBusiness({ name: 'Tienda', branchName: 'Centro', giro: 'ropa', idempotencyKey: 'key-1' });
    expect(fetch.mock.calls).toEqual([
      ['/api/auth/register', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Sofia', email: 'sofia@test.local', password: 'strong-pass', confirmation: 'strong-pass', terms: true }) }],
      ['/api/businesses', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'key-1' }, body: JSON.stringify({ name: 'Tienda', branchName: 'Centro', giro: 'ropa', idempotencyKey: 'key-1' }) }],
    ]);
  });
});
